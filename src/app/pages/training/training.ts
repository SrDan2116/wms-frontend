import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TrainingService, HistorialEntrenamiento } from '../../services/training/training.service';
import { RoutinesService, Rutina, DiaRutina } from '../../services/routines/routines.service';
import { RouterLink } from '@angular/router';
import { FittrackAlert } from '../../utils/swal-custom';
import { debounceTime } from 'rxjs/operators';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  hasWorkout: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './training.html',
  styleUrl: './training.scss'
})
export class TrainingComponent implements OnInit, OnDestroy {
  private trainingService = inject(TrainingService);
  private routinesService = inject(RoutinesService);
  private fb = inject(FormBuilder);

  activeTab: 'HISTORY' | 'NEW' = 'HISTORY';
  isLoading = true;
  history: HistorialEntrenamiento[] = [];

  // --- COMPARACIÓN ÚLTIMA VEZ ---
  lastSessionStats: { [key: string]: any[] } = {};

  // CALENDARIO
  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  selectedDate: Date | null = null;
  selectedWorkouts: HistorialEntrenamiento[] = [];

  // VARIABLES RUTINAS
  misRutinas: Rutina[] = [];
  rutinaSeleccionada: Rutina | null = null;
  diasDisponibles: DiaRutina[] = [];

  // --- NUEVO: Variables para controlar los Selects visualmente ---
  currentRoutineId: any = "";
  currentDayIndex: any = "";

  // FORMULARIO
  workoutForm: FormGroup = this.fb.group({
    nombreRutina: ['', Validators.required],
    notasGenerales: [''],
    fechaHora: [new Date().toISOString().split('T')[0], Validators.required],
    ejercicios: this.fb.array([])
  });

  // VARIABLES TEMPORIZADOR
  pingInterval: any;
  timerInterval: any;
  restTime = 90;
  timeLeft = 0;
  isTimerRunning = false;

  private readonly STORAGE_KEY = 'fittrack_temp_workout_v1';

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit() {
    this.generateCalendar();
    if (!this.selectedDate) this.selectDate(new Date());

    // Cargamos datos. NOTA: restoreDraft se llamará cuando carguen las rutinas
    this.loadHistory();
    this.loadMyRoutines();

    this.setupAutoSave();

    this.pingInterval = setInterval(() => {
        this.sendPing();
    }, 600000);
  }

  ngOnDestroy() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  // =========================================================
  // AUTO-GUARDADO Y RESTAURACIÓN
  // =========================================================

  setupAutoSave() {
    this.workoutForm.valueChanges
      .pipe(debounceTime(500))
      .subscribe(val => {
        if (val.ejercicios && val.ejercicios.length > 0) {
          // Guardamos el formulario Y el contexto (IDs de los selects)
          const backupState = {
             form: val,
             meta: {
                 routineId: this.currentRoutineId,
                 dayIndex: this.currentDayIndex
             }
          };
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backupState));
        }
      });
  }

  restoreDraft() {
    const draftJson = localStorage.getItem(this.STORAGE_KEY);
    if (!draftJson) return;

    try {
      const state = JSON.parse(draftJson);
      const draft = state.form; // Los datos del formulario
      const meta = state.meta;  // Los IDs de rutina y día

      // 1. Restaurar contexto de Rutina (para que se llenen los selects y variables)
      if (meta && meta.routineId) {
          this.currentRoutineId = meta.routineId;
          this.rutinaSeleccionada = this.misRutinas.find(r => r.id == this.currentRoutineId) || null;

          if (this.rutinaSeleccionada) {
              this.diasDisponibles = this.rutinaSeleccionada.dias;
          }
          if (meta.dayIndex !== undefined && meta.dayIndex !== "") {
              this.currentDayIndex = meta.dayIndex;
          }
      }

      // 2. Limpiar formulario actual
      this.ejerciciosControls.clear();

      // 3. Reconstruir formulario
      if (draft.ejercicios && Array.isArray(draft.ejercicios)) {
        draft.ejercicios.forEach((ej: any) => {

          // --- IMPORTANTE: Aquí recuperamos los stats de la sesión anterior ---
          this.findLastStatsForExercise(ej.nombre);

          const seriesFormArray = this.fb.array([]);

          if (ej.series && Array.isArray(ej.series)) {
            ej.series.forEach((s: any) => {
              seriesFormArray.push(this.createSerieGroup(s.metaReps || '-') as any);
            });
          }

          const ejercicioGroup = this.fb.group({
            nombre: [ej.nombre || '', Validators.required],
            completed: [ej.completed || false],
            series: seriesFormArray
          });

          this.ejerciciosControls.push(ejercicioGroup);
        });
      }

      // 4. Parchar valores
      this.workoutForm.patchValue(draft);
      this.activeTab = 'NEW';

      const Toast = FittrackAlert.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
      Toast.fire({ icon: 'info', title: 'Sesión recuperada' });

    } catch (e) {
      console.error('Error al restaurar borrador', e);
      this.clearDraft();
    }
  }

  clearDraft() {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentRoutineId = "";
    this.currentDayIndex = "";
  }

  // =========================================================
  // CARGA DE DATOS
  // =========================================================

  loadMyRoutines() {
    this.routinesService.getMyRoutines().subscribe({
        next: (data) => {
            this.misRutinas = data;
            // Intentamos restaurar SOLO cuando ya tenemos las rutinas cargadas
            // para poder vincular el ID guardado con la rutina real.
            this.restoreDraft();
        }
    });
  }

  loadHistory() {
    this.isLoading = true;
    this.trainingService.getHistory().subscribe({
      next: (data) => {
        this.history = data;
        this.generateCalendar();
        this.isLoading = false;

        // Si la restauración ocurrió ANTES de que llegara el historial,
        // los stats estarían vacíos. Volvemos a buscarlos por si acaso.
        if (this.ejerciciosControls.length > 0) {
             this.ejerciciosControls.controls.forEach(control => {
                 this.findLastStatsForExercise(control.get('nombre')?.value);
             });
        }
      },
      error: (err) => {
        this.isLoading = false;
      }
    });
  }

  // =========================================================
  // LÓGICA DE SELECTORES (MODIFICADA)
  // =========================================================

  onRutinaSelect(event: any) {
    const idRutina = event.target.value;

    // Si el usuario cambia manualmente, borramos el borrador previo
    this.clearDraft();

    this.currentRoutineId = idRutina; // Actualizamos variable visual
    this.currentDayIndex = "";        // Reseteamos día

    this.rutinaSeleccionada = this.misRutinas.find(r => r.id == idRutina) || null;
    if (this.rutinaSeleccionada) {
        this.diasDisponibles = this.rutinaSeleccionada.dias;
        this.workoutForm.patchValue({ nombreRutina: this.rutinaSeleccionada.nombre });
    } else {
        this.diasDisponibles = [];
        this.rutinaSeleccionada = null;
    }
  }

  onDiaSelect(event: any) {
    const indexDia = event.target.value;
    if (indexDia === "" || !this.rutinaSeleccionada) return;

    // Si cambia manualmente, borramos borrador y cargamos plantilla limpia
    this.clearDraft();

    this.currentDayIndex = indexDia; // Actualizamos variable visual

    const diaPlan = this.diasDisponibles[indexDia];

    this.ejerciciosControls.clear();
    this.lastSessionStats = {};

    diaPlan.ejercicios.forEach(plan => {
        this.findLastStatsForExercise(plan.nombre);

        const ejercicioGroup = this.fb.group({
            nombre: [plan.nombre, Validators.required],
            completed: [false],
            series: this.fb.array([])
        });
        for (let i = 0; i < plan.seriesObjetivo; i++) {
            (ejercicioGroup.get('series') as FormArray).push(this.createSerieGroup(plan.repeticionesObjetivo) as any);
        }
        this.ejerciciosControls.push(ejercicioGroup);
    });
    this.workoutForm.patchValue({ nombreRutina: `${this.rutinaSeleccionada.nombre} - ${diaPlan.nombre}` });
  }

  // =========================================================
  // RESTO DEL CÓDIGO (Igual que antes)
  // =========================================================

  sendPing() {
      console.log('Manteniendo servidor despierto... 💓');
      this.trainingService.keepAlive().subscribe();
  }

  startRest(seconds: number = 120) {
      this.stopRest();
      this.restTime = seconds;
      this.timeLeft = seconds;
      this.isTimerRunning = true;
      this.sendPing();

      this.timerInterval = setInterval(() => {
          if (this.timeLeft > 0) {
              this.timeLeft--;
          } else {
              this.stopRest();
              this.playAlarm();
          }
      }, 1000);
  }

  stopRest() {
      this.isTimerRunning = false;
      if (this.timerInterval) clearInterval(this.timerInterval);
  }

  addTime(seconds: number) {
      this.timeLeft += seconds;
  }

  formatTime(seconds: number): string {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  playAlarm() {
      try {
          const audio = new Audio('assets/sounds/beep.mp3');
          audio.play();
      } catch (e) { console.log('Audio no disponible'); }
  }

  isExerciseCompleted(index: number): boolean {
      return this.ejerciciosControls.at(index).get('completed')?.value;
  }

  toggleExerciseCompletion(index: number) {
      const control = this.ejerciciosControls.at(index).get('completed');
      if (control) {
          const newVal = !control.value;
          control.setValue(newVal);
          if (newVal) this.sendPing();
      }
  }

  findLastStatsForExercise(nombreEjercicio: string) {
    const lastWorkout = this.history.find(h =>
        h.ejerciciosRealizados.some(e => e.nombreEjercicio === nombreEjercicio)
    );
    if (lastWorkout) {
        const exerciseData = lastWorkout.ejerciciosRealizados.find(e => e.nombreEjercicio === nombreEjercicio);
        if (exerciseData) {
            this.lastSessionStats[nombreEjercicio] = exerciseData.series;
        }
    }
  }

  getLastSeriesInfo(nombreEjercicio: string, indexSerie: number): string | null {
      const stats = this.lastSessionStats[nombreEjercicio];
      if (stats && stats[indexSerie]) {
          const s = stats[indexSerie];
          return `${s.peso}kg x ${s.repeticiones}`;
      }
      return null;
  }

  // --- LÓGICA CALENDARIO ---
  generateCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();

    this.calendarDays = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
        this.calendarDays.unshift({ date: new Date(year, month, -i), isCurrentMonth: false, hasWorkout: false, isToday: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
        const date = new Date(year, month, i);
        const hasWorkout = this.checkIfHasWorkout(date);
        const isToday = this.isSameDate(date, new Date());
        this.calendarDays.push({ date, isCurrentMonth: true, hasWorkout, isToday });
    }
  }

  changeMonth(offset: number) {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + offset, 1);
    this.generateCalendar();
    this.selectedDate = null;
    this.selectedWorkouts = [];
  }

  selectDate(date: Date) {
    this.selectedDate = date;
    this.selectedWorkouts = this.history.filter(h => this.isSameDate(new Date(h.fechaHora), date));
  }

  deleteTraining(id: number) {
    FittrackAlert.fire({
      title: '¿Borrar registro?',
      text: "Este entrenamiento desaparecerá de tu historial.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Mantener'
    }).then((result) => {
      if (result.isConfirmed) {
        this.history = this.history.filter(h => h.id !== id);
        this.selectedWorkouts = this.selectedWorkouts.filter(h => h.id !== id);
        this.generateCalendar();

        this.trainingService.deleteWorkout(id).subscribe({
            next: () => {
                const Toast = FittrackAlert.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000 });
                Toast.fire({ icon: 'success', title: 'Registro eliminado' });
            },
            error: () => {
                FittrackAlert.fire('Error', 'No se pudo eliminar.', 'error');
                this.loadHistory();
            }
        });
      }
    });
  }

  private isSameDate(d1: Date, d2: Date): boolean {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  }
  private checkIfHasWorkout(date: Date): boolean {
    return this.history.some(h => this.isSameDate(new Date(h.fechaHora), date));
  }

  switchTab(tab: 'HISTORY' | 'NEW') {
    this.activeTab = tab;
    if (tab === 'HISTORY' && this.history.length === 0) this.loadHistory();
  }

  get ejerciciosControls() { return (this.workoutForm.get('ejercicios') as FormArray); }
  getSeriesControls(index: number) { return (this.ejerciciosControls.at(index).get('series') as FormArray<any>); }

  addEjercicio() {
    const g = this.fb.group({
        nombre: ['', Validators.required],
        completed: [false],
        series: this.fb.array([])
    });
    (g.get('series') as FormArray).push(this.createSerieGroup() as any);
    this.ejerciciosControls.push(g);
  }

  removeEjercicio(i: number) { this.ejerciciosControls.removeAt(i); }

  addSerie(i: number) {
    const series = this.getSeriesControls(i);
    const last = series.length > 0 ? series.at(series.length - 1).value : null;
    const s = this.createSerieGroup();
    if (last) s.patchValue({ peso: last.peso, repeticiones: last.repeticiones });
    series.push(s as any);
  }

  removeSerie(i: number, j: number) { this.getSeriesControls(i).removeAt(j); }

  createSerieGroup(meta: string = '-'): FormGroup {
    return this.fb.group({
      peso: [null, [Validators.required, Validators.min(0)]],
      repeticiones: [null, [Validators.required, Validators.min(1)]],
      metaReps: [meta]
    });
  }

  saveWorkout() {
    if (this.workoutForm.invalid) return;
    this.isLoading = true;

    const formValue = this.workoutForm.value;
    const ejerciciosLimpios = formValue.ejercicios.map((ej: any) => {
        const { completed, ...resto } = ej;
        return resto;
    });

    const fechaInput = formValue.fechaHora;
    const horaActual = new Date().toTimeString().split(' ')[0];
    const fechaCompleta = `${fechaInput}T${horaActual}`;

    const payload = {
        ...formValue,
        ejercicios: ejerciciosLimpios,
        fechaHora: fechaCompleta
    };

    this.trainingService.saveWorkout(payload).subscribe({
      next: (nuevo) => {
        this.clearDraft(); // Borramos borrador al finalizar

        this.history.unshift(nuevo);
        this.generateCalendar();

        const partesFecha = fechaInput.split('-');
        const fechaParaCalendario = new Date(Number(partesFecha[0]), Number(partesFecha[1]) - 1, Number(partesFecha[2]));
        this.selectDate(fechaParaCalendario);

        this.workoutForm.reset({
            fechaHora: new Date().toISOString().split('T')[0],
            nombreRutina: '', notasGenerales: ''
        });
        this.ejerciciosControls.clear();
        this.lastSessionStats = {};
        this.activeTab = 'HISTORY';
        this.isLoading = false;

        FittrackAlert.fire({
             title: '¡Guardado!',
             text: 'Entrenamiento registrado correctamente.',
             icon: 'success',
             timer: 1500,
             showConfirmButton: false
        });
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        alert("Ocurrió un error al guardar. Verifica los datos.");
      }
    });
  }
}

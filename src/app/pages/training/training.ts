import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TrainingService, HistorialEntrenamiento } from '../../services/training/training.service';
import { RoutinesService, Rutina, DiaRutina } from '../../services/routines/routines.service';
import { RouterLink } from '@angular/router';
import { FittrackAlert } from '../../utils/swal-custom';

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

  // CALENDARIO
  currentDate = new Date();
  calendarDays: CalendarDay[] = [];
  selectedDate: Date | null = null;
  selectedWorkouts: HistorialEntrenamiento[] = [];

  // VARIABLES RUTINAS
  misRutinas: Rutina[] = [];
  rutinaSeleccionada: Rutina | null = null;
  diasDisponibles: DiaRutina[] = [];

  // FORMULARIO
  workoutForm: FormGroup = this.fb.group({
    nombreRutina: ['', Validators.required],
    notasGenerales: [''],
    fechaHora: [new Date().toISOString().split('T')[0], Validators.required],
    ejercicios: this.fb.array([])
  });

  // --- VARIABLES TEMPORIZADOR & KEEP-ALIVE ---
  pingInterval: any;      // Intervalo de seguridad (10 min)
  timerInterval: any;     // Intervalo del cronómetro (1 seg)

  restTime = 90;          // Tiempo de descanso por defecto (segundos)
  timeLeft = 0;           // Tiempo restante actual
  isTimerRunning = false; // Estado del timer visual

  // =========================================================
  // CICLO DE VIDA
  // =========================================================

  ngOnInit() {
    this.generateCalendar();
    if (!this.selectedDate) this.selectDate(new Date());
    this.loadHistory();
    this.loadMyRoutines();

    // 1. PING AUTOMÁTICO DE SEGURIDAD (Cada 10 minutos)
    // Esto evita que Render se duerma si el usuario tarda mucho pensando
    this.pingInterval = setInterval(() => {
        this.sendPing();
    }, 600000); // 10 min = 600,000 ms
  }

  ngOnDestroy() {
    // Limpieza vital para no dejar procesos zombies
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }

  // =========================================================
  // LÓGICA KEEP-ALIVE & TEMPORIZADOR
  // =========================================================

  sendPing() {
      // Llama al endpoint ligero que creamos en el backend
      // Asumimos que agregaste keepAlive() a tu TrainingService o usas http directo
      // Si no lo tienes en el servicio, usa this.http.get(...)
      console.log('Manteniendo servidor despierto... 💓');
      this.trainingService.keepAlive().subscribe();
  }

  // Iniciar descanso (Botón del relojito)
  startRest(seconds: number = 120) {
      this.stopRest();
      this.restTime = seconds;
      this.timeLeft = seconds;
      this.isTimerRunning = true;

      // Al iniciar descanso, enviamos un ping (acción de usuario)
      this.sendPing();

      this.timerInterval = setInterval(() => {
          if (this.timeLeft > 0) {
              this.timeLeft--;
          } else {
              this.stopRest();
              // Opcional: Sonido
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
      // Sonido simple del sistema (si el navegador lo permite) o nada
      try {
          const audio = new Audio('assets/sounds/beep.mp3');
          audio.play();
      } catch (e) { console.log('Audio no disponible'); }
  }

  // =========================================================
  // LÓGICA DE FORMULARIO MEJORADA (Checks)
  // =========================================================

  // Helper para saber si un ejercicio está marcado como "Completado"
  // Usamos un FormControl extra 'completed' en el grupo
  isExerciseCompleted(index: number): boolean {
      return this.ejerciciosControls.at(index).get('completed')?.value;
  }

  toggleExerciseCompletion(index: number) {
      const control = this.ejerciciosControls.at(index).get('completed');
      if (control) {
          const newVal = !control.value;
          control.setValue(newVal);

          // Si marcó como completado, enviamos ping para asegurar
          if (newVal) this.sendPing();
      }
  }

  // =========================================================
  // LÓGICA DE CARGA DE DATOS (Igual que antes)
  // =========================================================

  loadMyRoutines() {
    this.routinesService.getMyRoutines().subscribe({ next: (data) => this.misRutinas = data });
  }

  loadHistory() {
    this.isLoading = true;
    this.trainingService.getHistory().subscribe({
      next: (data) => {
        this.history = data;
        this.generateCalendar();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar historial', err);
        this.isLoading = false;
      }
    });
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

  // --- BORRAR ENTRENO ---
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

  // --- RUTINAS Y FORMULARIO ---
  onRutinaSelect(event: any) {
    const idRutina = event.target.value;
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
    const diaPlan = this.diasDisponibles[indexDia];
    this.ejerciciosControls.clear();

    diaPlan.ejercicios.forEach(plan => {
        const ejercicioGroup = this.fb.group({
            nombre: [plan.nombre, Validators.required],
            completed: [false], // NUEVO: Estado de completado
            series: this.fb.array([])
        });
        for (let i = 0; i < plan.seriesObjetivo; i++) {
            (ejercicioGroup.get('series') as FormArray).push(this.createSerieGroup(plan.repeticionesObjetivo));
        }
        this.ejerciciosControls.push(ejercicioGroup);
    });
    this.workoutForm.patchValue({ nombreRutina: `${this.rutinaSeleccionada.nombre} - ${diaPlan.nombre}` });
  }

  get ejerciciosControls() { return (this.workoutForm.get('ejercicios') as FormArray); }
  getSeriesControls(index: number) { return (this.ejerciciosControls.at(index).get('series') as FormArray); }

  addEjercicio() {
    const g = this.fb.group({
        nombre: ['', Validators.required],
        completed: [false], // NUEVO
        series: this.fb.array([])
    });
    (g.get('series') as FormArray).push(this.createSerieGroup());
    this.ejerciciosControls.push(g);
  }

  removeEjercicio(i: number) { this.ejerciciosControls.removeAt(i); }

  addSerie(i: number) {
    const series = this.getSeriesControls(i);
    const last = series.length > 0 ? series.at(series.length - 1).value : null;
    const s = this.createSerieGroup();
    if (last) s.patchValue({ peso: last.peso, repeticiones: last.repeticiones });
    series.push(s);
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
    // Eliminamos el campo 'completed' antes de enviar, ya que el backend no lo espera en el Historial
    // (O si quieres guardarlo, déjalo, pero asegúrate que el DTO lo acepte)
    const ejerciciosLimpios = formValue.ejercicios.map((ej: any) => {
        const { completed, ...resto } = ej; // Destructuring para quitar 'completed'
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
        this.activeTab = 'HISTORY';
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        alert("Ocurrió un error al guardar. Verifica los datos.");
      }
    });
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TrainingService, HistorialEntrenamiento } from '../../services/training/training.service';
import { RoutinesService, Rutina, DiaRutina } from '../../services/routines/routines.service';
import { RouterLink } from '@angular/router';

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
  templateUrl: './training.html', // Asegúrate de que coincida con tu archivo
  styleUrl: './training.scss'      // Asegúrate de que coincida con tu archivo
})
export class TrainingComponent implements OnInit {
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

  // FORMULARIO (Con Fecha Editable)
  workoutForm: FormGroup = this.fb.group({
    nombreRutina: ['', Validators.required],
    notasGenerales: [''],
    // Inicializamos con fecha de hoy en formato YYYY-MM-DD para el input type="date"
    fechaHora: [new Date().toISOString().split('T')[0], Validators.required],
    ejercicios: this.fb.array([])
  });

  ngOnInit() {
    // 1. Generamos la estructura del calendario INMEDIATAMENTE
    this.generateCalendar();

    // 2. Seleccionamos el día de hoy visualmente
    if (!this.selectedDate) this.selectDate(new Date());

    // 3. Cargamos los datos del servidor
    this.loadHistory();
    this.loadMyRoutines();
  }

  loadMyRoutines() {
    this.routinesService.getMyRoutines().subscribe({ next: (data) => this.misRutinas = data });
  }

  loadHistory() {
    this.isLoading = true;
    this.trainingService.getHistory().subscribe({
      next: (data) => {
        this.history = data;
        // Regeneramos el calendario para pintar los puntitos verdes con la data fresca
        this.generateCalendar();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar historial', err);
        this.isLoading = false;
        // El calendario sigue visible gracias a la llamada en ngOnInit
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

    // Padding anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
        this.calendarDays.unshift({ date: new Date(year, month, -i), isCurrentMonth: false, hasWorkout: false, isToday: false });
    }

    // Días del mes
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
    if(!confirm('¿Eliminar este registro de entrenamiento?')) return;

    // 1. UI Optimista: Borrar de las listas locales
    this.history = this.history.filter(h => h.id !== id);
    this.selectedWorkouts = this.selectedWorkouts.filter(h => h.id !== id);

    // 2. Regenerar calendario (para que desaparezca el puntito verde si era el único entreno)
    this.generateCalendar();

    // 3. Llamada al Backend
    this.trainingService.deleteWorkout(id).subscribe({
        error: () => {
            alert('Error al eliminar');
            this.loadHistory(); // Rollback
        }
    });
  }

  // --- HELPERS FECHA ---
  private isSameDate(d1: Date, d2: Date): boolean {
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  }
  private checkIfHasWorkout(date: Date): boolean {
    return this.history.some(h => this.isSameDate(new Date(h.fechaHora), date));
  }

  switchTab(tab: 'HISTORY' | 'NEW') {
    this.activeTab = tab;
    // Solo recargamos si no hay datos, para ahorrar peticiones
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
    const g = this.fb.group({ nombre: ['', Validators.required], series: this.fb.array([]) });
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

    // 1. Obtenemos los valores del formulario
    const formValue = this.workoutForm.value;

    // 2. ARREGLO DE FECHA: Convertimos "YYYY-MM-DD" a "YYYY-MM-DDTHH:mm:ss"
    // Tomamos la fecha del input y le pegamos la hora actual
    const fechaInput = formValue.fechaHora; // "2025-12-22"
    const horaActual = new Date().toTimeString().split(' ')[0]; // "14:35:12"
    const fechaCompleta = `${fechaInput}T${horaActual}`; // "2025-12-22T14:35:12"

    // Creamos el objeto final para enviar
    const payload = {
        ...formValue,
        fechaHora: fechaCompleta
    };

    // 3. Enviamos el payload corregido
    this.trainingService.saveWorkout(payload).subscribe({
      next: (nuevo) => {
        this.history.unshift(nuevo);
        this.generateCalendar();

        // Ir visualmente a la fecha que acabamos de guardar
        // Ojo: usamos fechaInput (YYYY-MM-DD) para el calendario, que lo entiende bien
        // pero necesitamos convertirlo a Date
        const partesFecha = fechaInput.split('-');
        // Mes en JS es 0-indexado (Enero = 0)
        const fechaParaCalendario = new Date(partesFecha[0], partesFecha[1] - 1, partesFecha[2]);
        this.selectDate(fechaParaCalendario);

        // Limpieza y reset
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

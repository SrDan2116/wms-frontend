import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RoutinesService, Rutina } from '../../services/routines/routines.service';
import { RouterLink } from '@angular/router';
import { FittrackAlert } from '../../utils/swal-custom';

@Component({
  selector: 'app-routines',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './routines.html',
  styleUrl: './routines.scss'
})
export class RoutinesComponent implements OnInit {
  private routinesService = inject(RoutinesService);
  private fb = inject(FormBuilder);

  // Estados: LISTA | CREAR/EDITAR | DETALLE (Solo lectura)
  viewMode: 'LIST' | 'CREATE' | 'DETAILS' = 'LIST';

  rutinas: Rutina[] = [];
  selectedRoutine: Rutina | null = null; // Para la vista de detalle
  isLoading = true;
  editingRoutineId: number | null = null;

  // Formulario Maestro
  routineForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    descripcion: [''],
    dias: this.fb.array([])
  });

  ngOnInit() {
    this.loadRoutines();
  }

  loadRoutines() {
    this.isLoading = true;
    this.routinesService.getMyRoutines().subscribe({
      next: (data) => {
        this.rutinas = data;
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  // --- NAVEGACIÓN ---

  // Abrir vista de detalle (Solo lectura)
  viewRoutine(rutina: Rutina) {
    this.selectedRoutine = rutina;
    this.viewMode = 'DETAILS';
  }

  // Volver a la lista
  goBackToList() {
    this.viewMode = 'LIST';
    this.selectedRoutine = null;
    this.editingRoutineId = null;
  }

  // Iniciar edición (Desde el detalle)
  startEdit() {
    if (!this.selectedRoutine) return;
    this.editRoutineLogic(this.selectedRoutine);
  }

  // --- LÓGICA DEL FORMULARIO ---

  get diasControls() { return (this.routineForm.get('dias') as FormArray); }
  getEjerciciosControls(diaIndex: number) { return (this.diasControls.at(diaIndex).get('ejercicios') as FormArray); }

  addDia() {
    const diaGroup = this.fb.group({
      nombre: ['Día ' + (this.diasControls.length + 1), Validators.required],
      ejercicios: this.fb.array([])
    });
    this.diasControls.push(diaGroup);

    // Agregar ejercicio por defecto para facilitar UX
    this.addEjercicio(this.diasControls.length - 1);
  }

  removeDia(index: number) { this.diasControls.removeAt(index); }

  addEjercicio(diaIndex: number) {
    const ejercicioGroup = this.fb.group({
      nombre: ['', Validators.required],
      seriesObjetivo: [4, [Validators.required, Validators.min(1)]],
      repeticionesObjetivo: ['10-12', Validators.required],
      notas: ['']
    });
    this.getEjerciciosControls(diaIndex).push(ejercicioGroup);
  }

  removeEjercicio(diaIndex: number, ejIndex: number) {
    this.getEjerciciosControls(diaIndex).removeAt(ejIndex);
  }

  // --- NUEVA FUNCIÓN: MOVER EJERCICIOS ---
  moveEjercicio(diaIndex: number, index: number, direction: 'up' | 'down') {
    const ejerciciosArray = this.getEjerciciosControls(diaIndex);
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    // Verificar que no nos salgamos de los límites del array
    if (newIndex >= 0 && newIndex < ejerciciosArray.length) {
      const control = ejerciciosArray.at(index);
      ejerciciosArray.removeAt(index);
      ejerciciosArray.insert(newIndex, control);
    }
  }

  // --- GUARDAR Y BORRAR (OPTIMIZADO) ---

  saveRoutine() {
    if (this.routineForm.invalid) return;
    this.isLoading = true;
    const routineData = this.routineForm.value;

    if (this.editingRoutineId) {
        // === MODO EDICIÓN ===
        const idEditado = this.editingRoutineId; // Capturamos ID

        this.routinesService.updateRoutine(idEditado, routineData).subscribe({
            next: (rutinaActualizada) => {
                // 1. Actualización Local (Sin recargar servidor)
                const index = this.rutinas.findIndex(r => r.id === idEditado);
                if (index !== -1) {
                    this.rutinas[index] = rutinaActualizada;
                }

                // 2. Finalizar
                this.finishAction();
            },
            error: () => this.isLoading = false
        });

    } else {
        // === MODO CREACIÓN ===
        this.routinesService.createRoutine(routineData).subscribe({
            next: (nuevaRutina) => {
                // 1. Actualización Local (Insertar al inicio)
                this.rutinas.unshift(nuevaRutina);

                // 2. Finalizar
                this.finishAction();
            },
            error: () => this.isLoading = false
        });
    }
  }

  deleteRoutine(id: number) {
    FittrackAlert.fire({
      title: '¿Estás seguro?',
      text: "Se eliminará la rutina y todo su contenido. No podrás deshacer esto.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, borrar rutina',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {

        // 1. UI Optimista (Borrar visualmente)
        const backup = [...this.rutinas]; // Copia de seguridad por si falla
        this.rutinas = this.rutinas.filter(r => r.id !== id);

        if (this.selectedRoutine?.id === id) {
          this.goBackToList();
        }

        // 2. Petición al Backend
        this.routinesService.deleteRoutine(id).subscribe({
          next: () => {
             const Toast = FittrackAlert.mixin({
               toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
             });
             Toast.fire({ icon: 'success', title: 'Rutina eliminada' });
          },
          error: () => {
            // Rollback si falla
            this.rutinas = backup;
            FittrackAlert.fire('Error', 'No se pudo eliminar la rutina.', 'error');
          }
        });
      }
    });
  }

  // --- LÓGICA INTERNA Y HELPERS ---

  private finishAction() {
    this.goBackToList();
    this.resetForm();
    this.isLoading = false;
  }

  // Lógica interna para poblar el formulario
  private editRoutineLogic(rutina: Rutina) {
    // 1. Primero reseteamos el formulario limpio
    this.resetForm();

    // 2. Luego asignamos valores
    this.editingRoutineId = rutina.id!;
    this.viewMode = 'CREATE';

    this.routineForm.patchValue({
      nombre: rutina.nombre,
      descripcion: rutina.descripcion
    });

    // 3. Reconstruir Arrays
    rutina.dias.forEach(dia => {
      const diaGroup = this.fb.group({
        nombre: [dia.nombre, Validators.required],
        ejercicios: this.fb.array([])
      });

      dia.ejercicios.forEach(ej => {
        const ejGroup = this.fb.group({
            nombre: [ej.nombre, Validators.required],
            seriesObjetivo: [ej.seriesObjetivo, [Validators.required, Validators.min(1)]],
            repeticionesObjetivo: [ej.repeticionesObjetivo, Validators.required],
            notas: [ej.notas]
        });
        (diaGroup.get('ejercicios') as FormArray).push(ejGroup);
      });
      this.diasControls.push(diaGroup);
    });
  }

  resetForm() {
    this.routineForm.reset();
    this.diasControls.clear();
    this.editingRoutineId = null;
  }
}

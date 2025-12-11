import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CategoriaService } from '../../core/services/categoria';
import { AlertService } from '../../core/services/alert';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './category-form.html',
  styleUrl: './category-form.scss'
})
export class CategoryFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private categoriaService = inject(CategoriaService);
  private alertService = inject(AlertService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  isEditMode = false;
  categoryId?: number;

  form: FormGroup = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: ['']
  });

  ngOnInit(): void {
    const id = this.route.snapshot.params['id'];
    if (id) {
      this.isEditMode = true;
      this.categoryId = Number(id);
      this.cargarDatos(this.categoryId);
    }
  }

  cargarDatos(id: number) {
    this.categoriaService.getById(id).subscribe(cat => {
      this.form.patchValue(cat);
      this.cdr.detectChanges();
    });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const categoria = this.form.value;

    // Decidimos si creamos o actualizamos
    const peticion = (this.isEditMode && this.categoryId)
      ? this.categoriaService.update(this.categoryId, categoria)
      : this.categoriaService.create(categoria);

    peticion.subscribe({
      next: () => {
        const msg = this.isEditMode ? 'Categoría actualizada' : 'Categoría creada';
        this.alertService.success('¡Éxito!', msg);
        this.router.navigate(['/categorias']);
      },
      error: () => this.alertService.error('Error', 'No se pudo guardar.')
    });
  }
}

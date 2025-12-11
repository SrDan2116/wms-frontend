import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CategoriaService } from '../../core/services/categoria';
import { AlertService } from '../../core/services/alert';
import { Categoria } from '../../core/models/categoria';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './category-list.html',
  styleUrl: './category-list.scss'
})
export class CategoryListComponent implements OnInit {

  private categoriaService = inject(CategoriaService);
  private alertService = inject(AlertService);
  private cdr = inject(ChangeDetectorRef);

  categorias: Categoria[] = [];
  showingDeleted = false;

  ngOnInit(): void {
    this.cargarCategorias();
  }

  toggleVerEliminados() {
    this.showingDeleted = !this.showingDeleted;
    this.cargarCategorias();
  }

  cargarCategorias() {
    const peticion = this.showingDeleted
      ? this.categoriaService.getInactivos()
      : this.categoriaService.getAll();

    peticion.subscribe({
      next: (data) => {
        this.categorias = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  async eliminar(id: number) {
    const confirmado = await this.alertService.confirm(
      '¿Eliminar categoría?',
      'Se moverá a la papelera.'
    );

    if (confirmado) {
      this.categoriaService.delete(id).subscribe({
        next: () => {
          this.categorias = this.categorias.filter(c => c.id !== id);
          this.cdr.detectChanges();
          this.alertService.success('Categoría eliminada');
        },
        // CAPTURAMOS EL ERROR AQUÍ
        error: (err) => {
          console.error(err);
          // Si el backend nos manda un mensaje de texto (como "No se puede eliminar..."), lo mostramos
          if (err.status === 409) {
             this.alertService.error('Operación Bloqueada', 'No puedes eliminar esta categoría porque tiene productos activos asociados.');
          } else {
             this.alertService.error('Error', 'No se pudo eliminar la categoría.');
          }
        }
      });
    }
  }
  async restaurar(id: number) {
    const confirmado = await this.alertService.confirm(
      '¿Restaurar categoría?',
      'Volverá a estar disponible.', 'Sí, restaurar'
    );

    if (confirmado) {
      this.categoriaService.activate(id).subscribe({
        next: () => {
          this.categorias = this.categorias.filter(c => c.id !== id);
          this.cdr.detectChanges();
          this.alertService.success('Categoría restaurada');
        }
      });
    }
  }
}

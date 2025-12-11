import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductoService } from '../../core/services/producto';
import { Producto } from '../../core/models/producto';
import { AlertService } from '../../core/services/alert';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss'
})
export class ProductListComponent implements OnInit {

  private productoService = inject(ProductoService);
  private cdr = inject(ChangeDetectorRef);
  private alertService = inject(AlertService);

  productos: Producto[] = [];
  showingDeleted = false;

  ngOnInit(): void {
    this.cargarProductos();
  }

  toggleVerEliminados() {
    this.showingDeleted = !this.showingDeleted;
    this.cargarProductos();
  }

  cargarProductos() {
    const peticion = this.showingDeleted
      ? this.productoService.getInactivos()
      : this.productoService.getAll();

    peticion.subscribe({
      next: (data) => {
        this.productos = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  async eliminar(id: number | undefined) {
    if (!id) return;

    const confirmado = await this.alertService.confirm(
      '¿Eliminar producto?',
      'Esta acción moverá el producto a la papelera.'
    );

    if (confirmado) {
      this.productoService.delete(id).subscribe({
        next: () => {
          this.productos = this.productos.filter(p => p.id !== id);
          this.cdr.detectChanges();
          this.alertService.success('Producto eliminado');
        },
        error: (err) => {
          console.error(err);
          this.alertService.error('Error', 'No se pudo eliminar el producto.');
        }
      });
    }
  }

  async restaurar(id: number | undefined) {
    if (!id) return;

    const confirmado = await this.alertService.confirm(
      '¿Restaurar producto?',
      'El producto volverá al inventario activo.',
      'Sí, restaurar'
    );

    if (confirmado) {
      this.productoService.activate(id).subscribe(() => {
        this.productos = this.productos.filter(p => p.id !== id);
        this.cdr.detectChanges();
        this.alertService.success('Producto restaurado al inventario');
      });
    }
  }
}

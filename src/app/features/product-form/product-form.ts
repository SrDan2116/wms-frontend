import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';

import { ProductoService } from '../../core/services/producto';
import { CategoriaService } from '../../core/services/categoria';
import { Producto } from '../../core/models/producto';
import { Categoria } from '../../core/models/categoria';
import { AlertService } from '../../core/services/alert';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './product-form.html',
  styleUrl: './product-form.scss'
})
export class ProductFormComponent implements OnInit {

  private fb = inject(FormBuilder);
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private alertService = inject(AlertService);

  categorias: Categoria[] = [];
  isEditMode = false; // Bandera para saber si editamos
  productId?: number; // Aquí guardaremos el ID si existe

  form: FormGroup = this.fb.group({
    sku: ['', [Validators.required, Validators.minLength(3)]],
    nombre: ['', [Validators.required]],
    descripcion: [''],
    precioUnitario: [0, [Validators.required, Validators.min(0.01)]],
    pesoKg: [0, [Validators.required, Validators.min(0)]],
    categoriaId: [null, [Validators.required]]
  });

  ngOnInit(): void {
    this.cargarCategorias();

    // 1. Verificar si hay un ID en la URL
    const id = this.route.snapshot.params['id'];

    if (id) {
      // ESTAMOS EN MODO EDICIÓN
      this.isEditMode = true;
      this.productId = Number(id);
      this.cargarDatosProducto(this.productId);
    }
  }

  cargarCategorias() {
    this.categoriaService.getAll().subscribe(data => {
      this.categorias = data;
      this.cdr.detectChanges();
    });
  }

  // 2. Traer datos del backend y ponerlos en el formulario
  cargarDatosProducto(id: number) {
    this.productoService.getById(id).subscribe({
      next: (prod) => {
        this.form.patchValue(prod); // ¡Magia! Rellena todo automático
        this.cdr.detectChanges();
      },
      error: (err) => console.error(err)
    });
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const producto = this.form.value;

    // Definimos qué operación hacer (Crear o Actualizar)
    const peticion = (this.isEditMode && this.productId)
      ? this.productoService.update(this.productId, producto)
      : this.productoService.create(producto);

    // Ejecutamos
    peticion.subscribe({
      next: () => {
        // Mensaje dinámico
        const mensaje = this.isEditMode ? 'Producto actualizado' : 'Producto creado';

        this.alertService.success('¡Éxito!', mensaje);
        this.router.navigate(['/productos']);
      },
      error: (err) => {
        console.error(err);
        this.alertService.error('Error', 'Hubo un problema al guardar los cambios.');
      }
    });
  }
}

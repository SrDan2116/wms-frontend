import { Routes } from '@angular/router';
import { ProductListComponent } from './features/product-list/product-list';
import { ProductFormComponent } from './features/product-form/product-form';
import { CategoryFormComponent } from './features/category-form/category-form';
import { CategoryListComponent } from './features/category-list/category-list';

export const routes: Routes = [
  { path: '', component: ProductListComponent },
  { path: 'productos', component: ProductListComponent },
  { path: 'productos/nuevo', component: ProductFormComponent },
  { path: 'productos/editar/:id', component: ProductFormComponent },
  { path: 'categorias', component: CategoryListComponent },
  { path: 'categorias/nuevo', component: CategoryFormComponent },
  { path: 'categorias/editar/:id', component: CategoryFormComponent },

  { path: '**', redirectTo: '' }
];

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categoria } from '../models/categoria';

@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8080/api/categorias';

  getAll(): Observable<Categoria[]> { return this.http.get<Categoria[]>(this.apiUrl); }

  // NUEVO: Ver papelera
  getInactivos(): Observable<Categoria[]> { return this.http.get<Categoria[]>(`${this.apiUrl}/inactivos`); }

  getById(id: number): Observable<Categoria> { return this.http.get<Categoria>(`${this.apiUrl}/${id}`); }
  create(cat: Categoria): Observable<Categoria> { return this.http.post<Categoria>(this.apiUrl, cat); }
  update(id: number, cat: Categoria): Observable<Categoria> { return this.http.put<Categoria>(`${this.apiUrl}/${id}`, cat); }
  delete(id: number): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/${id}`); }

  // NUEVO: Restaurar
  activate(id: number): Observable<void> { return this.http.put<void>(`${this.apiUrl}/${id}/activar`, {}); }
}

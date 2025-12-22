import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

// Tipos que coinciden con tu Backend
export interface EjercicioPlan {
  nombre: string;
  seriesObjetivo: number;
  repeticionesObjetivo: string; // IMPORTANTE: String para "10-12"
  notas?: string;
}

export interface DiaRutina {
  nombre: string; // Ej: "Día 1: Torso"
  ejercicios: EjercicioPlan[];
}

export interface Rutina {
  id?: number;
  nombre: string;
  descripcion?: string;
  dias: DiaRutina[];
}

@Injectable({
  providedIn: 'root'
})
export class RoutinesService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/rutinas`;

  getMyRoutines(): Observable<Rutina[]> {
    return this.http.get<Rutina[]>(this.apiUrl);
  }

  createRoutine(rutina: Rutina): Observable<Rutina> {
    return this.http.post<Rutina>(this.apiUrl, rutina);
  }

  deleteRoutine(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  updateRoutine(id: number, rutina: Rutina): Observable<Rutina> {
    return this.http.put<Rutina>(`${this.apiUrl}/${id}`, rutina);
  }
}

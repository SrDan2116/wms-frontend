import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SerieRealizada {
  peso: number;
  repeticiones: number;
}

export interface EjercicioRealizado {
  nombreEjercicio: string;
  series: SerieRealizada[];
}

export interface HistorialEntrenamiento {
  id?: number;
  nombreRutina: string;
  notasGenerales: string;
  fechaHora: string;
  ejerciciosRealizados: EjercicioRealizado[];
}

@Injectable({
  providedIn: 'root'
})
export class TrainingService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/historial`;

  constructor() { }

  getHistory(): Observable<HistorialEntrenamiento[]> {
    return this.http.get<HistorialEntrenamiento[]>(this.apiUrl);
  }

  saveWorkout(data: any): Observable<HistorialEntrenamiento> {
    return this.http.post<HistorialEntrenamiento>(this.apiUrl, data);
  }

  // --- AGREGAR ESTE MÉTODO ---
  deleteWorkout(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

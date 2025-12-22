import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

export interface Peso {
  id: number;
  valor: number;
  fecha: string;
}

@Injectable({
  providedIn: 'root'
})
export class WeightService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/pesos`;

  // Obtener historial ordenado por fecha
  getHistory(): Observable<Peso[]> {
    return this.http.get<Peso[]>(this.apiUrl);
  }

  // Registrar nuevo peso
  addEntry(valor: number, fecha: string): Observable<Peso> {
    return this.http.post<Peso>(this.apiUrl, { valor, fecha });
  }
}

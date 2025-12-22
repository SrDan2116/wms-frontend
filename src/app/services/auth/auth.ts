import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, tap } from 'rxjs';

// --- IMPORTAMOS LAS INTERFACES SEPARADAS ---
import { AuthResponse } from '../../interfaces/auth-response.interface';
import { LoginRequest } from '../../interfaces/login-request.interface';
import { RegisterRequest } from '../../interfaces/register-request.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  // Asegúrate de que environment.apiUrl sea: 'https://wms-backend-9fug.onrender.com/api'
  private apiUrl = `${environment.apiUrl}/auth`;

  constructor() { }

  // --- REGISTRO ---
  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap(response => this.guardarSesion(response))
    );
  }

  // --- LOGIN ---
  login(credentials: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/authenticate`, credentials).pipe(
      tap(response => this.guardarSesion(response))
    );
  }

  // --- LOGOUT ---
  logout() {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('usuario');
  }

  // --- UTILIDADES ---
  private guardarSesion(response: AuthResponse) {
    sessionStorage.setItem('token', response.token);
    sessionStorage.setItem('usuario', response.nombreUsuario);
  }

  getToken(): string | null {
    return sessionStorage.getItem('token');
  }

  estoyLogueado(): boolean {
    return !!sessionStorage.getItem('token');
  }

  getUserProfile(): Observable<any> {
  return this.http.get(`${environment.apiUrl}/usuario/me`);
}

// Agrega este método
updateProfile(data: any): Observable<any> {
  return this.http.put(`${environment.apiUrl}/usuario/me`, data);
}
}

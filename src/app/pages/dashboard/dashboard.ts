import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth/auth';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  usuario: any = null;
  isLoading = true;
  isAdmin = false; // Variable para controlar la visibilidad del botón

  ngOnInit() {
    this.fetchUserData();
  }

  fetchUserData() {
    this.authService.getUserProfile().subscribe({
      next: (data) => {
        console.log('Datos del usuario:', data);
        this.usuario = data;

        // VERIFICACIÓN DE ROL:
        // Si el backend devuelve el campo 'role', lo usamos.
        this.isAdmin = this.usuario.role === 'ADMIN';

        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar perfil:', err);
        this.isLoading = false;
        if (err.status === 403) {
          this.logout();
        }
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}

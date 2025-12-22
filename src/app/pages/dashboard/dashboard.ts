import { Component, inject, OnInit } from '@angular/core'; // <--- Agregar OnInit
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

  usuario: any = null; // Aquí guardaremos los datos
  isLoading = true;

  ngOnInit() {
    this.fetchUserData();
  }

  fetchUserData() {
    this.authService.getUserProfile().subscribe({
      next: (data) => {
        console.log('Datos del usuario:', data);
        this.usuario = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar perfil:', err);
        this.isLoading = false;
        // Si el token expiró, lo mandamos al login
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

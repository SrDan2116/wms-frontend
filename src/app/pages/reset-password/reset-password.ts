import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { FittrackAlert } from '../../utils/swal-custom';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  token = '';
  password = '';
  isLoading = false;

  ngOnInit() {
    this.token = this.route.snapshot.queryParams['token'];
  }

  cambiar() {
    this.isLoading = true;
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        FittrackAlert.fire('¡Éxito!', 'Tu contraseña ha sido actualizada.', 'success').then(() => {
            this.router.navigate(['/login']);
        });
      },
      error: () => {
        this.isLoading = false;
        FittrackAlert.fire('Error', 'El token es inválido o ha expirado.', 'error');
      }
    });
  }
}

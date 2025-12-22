import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth/auth';
import { RouterLink } from '@angular/router';
import { FittrackAlert } from '../../utils/swal-custom';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  email = '';
  isLoading = false;

  enviar() {
    this.isLoading = true;
    this.authService.forgotPassword(this.email).subscribe({
      next: () => {
        this.isLoading = false;
        FittrackAlert.fire('¡Enviado!', 'Revisa tu correo (o la consola del servidor) para el enlace.', 'success');
      },
      error: () => {
        this.isLoading = false;
        FittrackAlert.fire('Error', 'No pudimos procesar tu solicitud.', 'error');
      }
    });
  }
}

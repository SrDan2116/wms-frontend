import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage = '';
  showPassword = false;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.form.value;
    const loginRequest = { email: email!, password: password! };

    this.authService.login(loginRequest).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Error login:', err);

        // --- LÓGICA DE SUSPENSIÓN ---
        // Verificamos si el backend nos devolvió el error específico de suspensión
        if (err.status === 403 && err.error?.error === 'ACCOUNT_SUSPENDED') {
            const fechaRaw = err.error.endsAt;
            let fechaTexto = 'Indefinido';

            if (fechaRaw && fechaRaw !== 'Indefinido') {
                const dateObj = new Date(fechaRaw);
                fechaTexto = dateObj.toLocaleDateString() + ' a las ' +
                             dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            }

            // Mensaje detallado para el usuario
            this.errorMessage = `CUENTA SUSPENDIDA\nMotivo: ${err.error.reason}\nHasta: ${fechaTexto}`;

        }
        // --- ERROR DE CREDENCIALES O GENÉRICO ---
        else if (err.status === 403 || err.status === 401) {
          this.errorMessage = 'Credenciales incorrectas. Inténtalo de nuevo.';
        } else {
          this.errorMessage = 'Ocurrió un error. Verifica tu conexión.';
        }
      }
    });
  }
}

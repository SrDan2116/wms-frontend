import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = false;
  errorMessage = '';
  showPassword = false; // Para el ojito

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    if (this.form.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    // Extraemos valores
    const { nombre, email, password } = this.form.value;

    // Construimos el objeto de petición (RegisterRequest)
    const registerRequest = {
      nombre: nombre!,
      email: email!,
      password: password!
    };

    this.authService.register(registerRequest).subscribe({
      next: () => {
        // Al registrarse con éxito, vamos al dashboard (o al login si prefieres)
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error(err);
        // Manejo básico de errores
        if (err.status === 409) {
            this.errorMessage = 'Este correo ya está registrado.';
        } else {
            this.errorMessage = 'No se pudo crear la cuenta. Intenta nuevamente.';
        }
      }
    });
  }
}

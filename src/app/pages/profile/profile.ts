import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth/auth';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FittrackAlert } from '../../utils/swal-custom';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  profileForm: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    fechaNacimiento: ['', Validators.required],
    genero: ['', Validators.required],
    alturaCm: ['', Validators.required],
    pesoActual: ['', Validators.required],
    nivelActividad: ['', Validators.required],
    objetivo: ['', Validators.required],
    intensidadObjetivo: ['', Validators.required],

    // EL INTERRUPTOR MÁGICO
    esManual: [false],

    // MACROS (Solo requeridos si es manual)
    caloriasObjetivo: [0],
    proteinasObjetivo: [0],
    carbohidratosObjetivo: [0],
    grasasObjetivo: [0]
  });

  isLoading = true;
  successMessage = '';

  ngOnInit() {
    this.cargarDatos();

    // Escuchar cambios en el checkbox "Manual"
    this.profileForm.get('esManual')?.valueChanges.subscribe(isManual => {
      this.toggleManualMode(isManual);
    });
  }

  cargarDatos() {
    this.authService.getUserProfile().subscribe({
      next: (user) => {
        // Mapeamos los datos del backend al formulario
        this.profileForm.patchValue({
            ...user,
            pesoActual: user.pesoInicial // Mapeamos pesoInicial a pesoActual
        });

        // Ajustar estado inicial de los campos
        this.toggleManualMode(user.esManual);
        this.isLoading = false;
      },
      error: () => this.isLoading = false
    });
  }

  toggleManualMode(isManual: boolean) {
    const macroControls = ['caloriasObjetivo', 'proteinasObjetivo', 'carbohidratosObjetivo', 'grasasObjetivo'];
    const autoControls = ['nivelActividad', 'objetivo', 'intensidadObjetivo'];

    if (isManual) {
      // Si es manual: Habilita macros, deshabilita config automática
      macroControls.forEach(c => this.profileForm.get(c)?.enable());
      autoControls.forEach(c => this.profileForm.get(c)?.disable());
    } else {
      // Si es automático: Deshabilita macros (se calculan solos), habilita config
      macroControls.forEach(c => this.profileForm.get(c)?.disable());
      autoControls.forEach(c => this.profileForm.get(c)?.enable());
    }
  }

  onSubmit() {
    if (this.profileForm.invalid) return;

    // Importante: getRawValue() obtiene incluso los campos deshabilitados
    const data = this.profileForm.getRawValue();

    this.authService.updateProfile(data).subscribe({
      next: (user) => {
        this.successMessage = '¡Perfil actualizado correctamente!';
        // Actualizamos el formulario con los nuevos valores calculados (si fue automático)
        this.profileForm.patchValue(user);
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => console.error(err)
    });
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }

  requestDeletion() {
    FittrackAlert.fire({
      title: '¿Eliminar Cuenta?',
      text: '¿Deseas enviar una solicitud al administrador para borrar tu cuenta permanentemente? Cuéntanos por qué:',
      input: 'textarea',
      inputPlaceholder: 'Motivo...',
      showCancelButton: true,
      confirmButtonText: 'Enviar Solicitud',
      confirmButtonColor: '#d33'
    }).then((res) => {
      if (res.isConfirmed && res.value) {
        this.authService.requestAccountDeletion(res.value).subscribe({
            next: (msg) => FittrackAlert.fire('Enviado', msg, 'success'),
            error: (err) => FittrackAlert.fire('Error', err.error || 'Ya tienes una solicitud pendiente.', 'error')
        });
      }
    });
  }
}

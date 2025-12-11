import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon } from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  // 1. Alerta de Éxito (Esquina superior derecha, tipo "Toast")
  success(title: string, text?: string) {
    Swal.fire({
      icon: 'success',
      title: title,
      text: text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: '#fff',
      iconColor: '#198754', // Verde éxito
      customClass: {
        popup: 'clean-toast' // Clase personalizada si quieres CSS extra
      }
    });
  }

  // 2. Alerta de Error (Modal centrado)
  error(title: string, text: string) {
    Swal.fire({
      icon: 'error',
      title: title,
      text: text,
      confirmButtonColor: '#000', // Negro (tu tema)
      confirmButtonText: 'Entendido'
    });
  }

  // 3. Confirmación (Para eliminar/restaurar)
  async confirm(title: string, text: string, confirmButtonText = 'Sí, continuar'): Promise<boolean> {
    const result = await Swal.fire({
      title: title,
      text: text,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000', // Negro
      cancelButtonColor: '#d33',  // Rojo
      confirmButtonText: confirmButtonText,
      cancelButtonText: 'Cancelar',
      reverseButtons: true, // Pone el botón de cancelar a la izquierda (más seguro)
      focusCancel: true     // El foco inicia en cancelar para evitar accidentes
    });

    return result.isConfirmed;
  }
}

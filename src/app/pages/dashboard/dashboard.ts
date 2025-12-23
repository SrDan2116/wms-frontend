import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth/auth';
import { AdminService } from '../../services/admin/admin.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);
  private router = inject(Router);

  usuario: any = null;
  isLoading = true;
  isAdmin = false;
  adminNotificationCount = 0;

  // Intervalo para actualización automática
  private refreshInterval: any;

  // Chat Variables
  isChatOpen = false;
  chatStep: 'MENU' | 'REASON' | 'DONE' = 'MENU';
  deletionReason = '';
  isSendingRequest = false;

  ngOnInit() {
    this.fetchUserData();
  }

  // Limpiar el intervalo al salir del componente
  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  fetchUserData() {
    this.authService.getUserProfile().subscribe({
      next: (data) => {
        this.usuario = data;
        this.isAdmin = this.usuario.role === 'ADMIN';

        if (this.isAdmin) {
            this.loadAdminCount();
            // ACTUALIZACIÓN AUTOMÁTICA: Consultar cada 10 segundos
            this.refreshInterval = setInterval(() => this.loadAdminCount(), 10000);
        }

        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 403) this.logout();
      }
    });
  }

  loadAdminCount() {
      this.adminService.getNotificationCount().subscribe({
          next: (count) => this.adminNotificationCount = count,
          error: (err) => console.warn('Error notificaciones:', err)
      });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // --- NAVEGACIÓN ADMIN ---
  goToAdmin(tab: string) {
      this.router.navigate(['/admin'], { queryParams: { tab: tab } });
  }

  // --- CHAT CLIENTE ---
  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
    if (!this.isChatOpen) setTimeout(() => this.chatStep = 'MENU', 300);
  }

  selectOption(option: string) {
    if (option === 'DELETE_ACCOUNT') this.chatStep = 'REASON';
  }

  sendDeletionRequest() {
    if (!this.deletionReason.trim()) return;
    this.isSendingRequest = true;

    this.authService.requestAccountDeletion(this.deletionReason).subscribe({
      next: () => {
        this.isSendingRequest = false;
        this.chatStep = 'DONE';
        this.deletionReason = '';

        // --- CERRAR SESIÓN AUTOMÁTICAMENTE ---
        // Esperamos 3 segundos para que lea el mensaje de despedida
        setTimeout(() => {
            this.logout();
        }, 3000);
      },
      error: (err) => {
        this.isSendingRequest = false;
        alert('Error: ' + (err.error || 'Error al enviar.'));
      }
    });
  }
}

import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../services/admin/admin.service';
import { FittrackAlert } from '../../utils/swal-custom';
import Swal from 'sweetalert2';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  users: any[] = [];
  deletionRequests: any[] = [];
  activeTab: 'USERS' | 'REQUESTS' = 'USERS';
  isLoading = true;

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    if (this.activeTab === 'USERS') {
      this.adminService.getUsers().subscribe(data => {
        this.users = data;
        this.isLoading = false;
      });
    } else {
      this.adminService.getDeletionRequests().subscribe(data => {
        this.deletionRequests = data;
        this.isLoading = false;
      });
    }
  }

  switchTab(tab: 'USERS' | 'REQUESTS') {
    this.activeTab = tab;
    this.loadData();
  }

  // --- LÓGICA DE SUSPENSIÓN (SweetAlert con Formulario HTML) ---
  openSuspendModal(user: any) {
    Swal.fire({
      title: `Suspender a ${user.nombre}`,
      html: `
        <div class="text-start">
          <label class="fw-bold small mb-1">Razón</label>
          <input id="swal-reason" class="form-control mb-3" placeholder="Ej: Comportamiento tóxico">

          <div class="row g-2">
            <div class="col-6">
               <label class="fw-bold small mb-1">Duración</label>
               <input type="number" id="swal-duration" class="form-control" value="2">
            </div>
            <div class="col-6">
               <label class="fw-bold small mb-1">Unidad</label>
               <select id="swal-unit" class="form-select">
                 <option value="HOURS">Horas</option>
                 <option value="DAYS" selected>Días</option>
                 <option value="WEEKS">Semanas</option>
                 <option value="MONTHS">Meses</option>
                 <option value="PERMANENT">Permanente</option>
               </select>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Aplicar Castigo 🔨',
      confirmButtonColor: '#d33',
      preConfirm: () => {
        return {
          userId: user.id,
          reason: (document.getElementById('swal-reason') as HTMLInputElement).value,
          durationValue: (document.getElementById('swal-duration') as HTMLInputElement).value,
          durationUnit: (document.getElementById('swal-unit') as HTMLSelectElement).value
        };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        this.adminService.suspendUser(result.value).subscribe(() => {
            FittrackAlert.fire('Suspendido', 'El usuario ha sido bloqueado.', 'success');
            this.loadData();
        });
      }
    });
  }

  unsuspend(id: number) {
    this.adminService.unsuspendUser(id).subscribe(() => {
        FittrackAlert.fire('Liberado', 'El usuario puede acceder de nuevo.', 'success');
        this.loadData();
    });
  }

  deleteUser(id: number, isRequest: boolean = false) {
    FittrackAlert.fire({
        title: '¿Borrado Definitivo?',
        text: 'Esto eliminará rutinas, historial y datos. No hay vuelta atrás.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar cuenta',
        confirmButtonColor: '#d33'
    }).then((res) => {
        if(res.isConfirmed) {
            this.adminService.deleteUser(id).subscribe(() => {
                FittrackAlert.fire('Eliminado', 'Usuario borrado del sistema.', 'success');
                this.loadData();
            });
        }
    });
  }
}

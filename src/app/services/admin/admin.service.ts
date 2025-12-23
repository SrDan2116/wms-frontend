import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/admin`;

  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users`);
  }

  getDeletionRequests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/deletion-requests`);
  }

  getNotificationCount(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/notifications-count`);
  }

  markRequestAsHandled(id: number): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/request/${id}/mark-handled`, {});
  }

  suspendUser(data: { userId: number, reason: string, durationValue: number, durationUnit: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/suspend`, data);
  }

  unsuspendUser(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/unsuspend/${id}`, {});
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/user/${id}`);
  }
}

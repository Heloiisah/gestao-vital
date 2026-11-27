import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { MovementKind } from '../../features/inventory/domain/inventory.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceUiState {
  readonly demoMode = inject(AuthService).isDemo;
  readonly query = signal('');
  readonly period = signal(30);
  readonly showDemoNotice = signal(true);
  readonly showNotifications = signal(false);
  readonly showMovementForm = signal(false);
  readonly showMedicineForm = signal(false);
  readonly forecastLoading = signal(false);
  readonly toast = signal('');
  readonly movementKind = signal<MovementKind>('Saída');

  private toastTimer: ReturnType<typeof setTimeout> | undefined;

  openMovement(kind: MovementKind = 'Saída'): void {
    this.movementKind.set(kind);
    this.showMovementForm.set(true);
  }

  notify(message: string): void {
    this.toast.set(message);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(''), 3200);
  }
}

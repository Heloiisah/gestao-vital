import { Signal } from '@angular/core';
import { DashboardAlert, DashboardSummary, InviteUserInput, ManagedUser, ManagedUserStatus } from '../domain/workspace.models';
import { UserRole } from '../../auth/domain/auth.models';

export abstract class WorkspaceRepository {
  abstract readonly dashboard: Signal<DashboardSummary | null>;
  abstract readonly alerts: Signal<DashboardAlert[]>;
  abstract readonly users: Signal<ManagedUser[]>;
  abstract loadDashboard(days: number): Promise<void>;
  abstract loadAlerts(): Promise<void>;
  abstract loadUsers(): Promise<void>;
  abstract inviteUser(input: InviteUserInput): Promise<void>;
  abstract updateUserRole(userId: string, role: UserRole): Promise<void>;
  abstract setUserStatus(userId: string, status: ManagedUserStatus): Promise<void>;
}

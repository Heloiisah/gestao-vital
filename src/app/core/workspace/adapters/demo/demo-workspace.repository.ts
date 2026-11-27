import { Signal, signal } from '@angular/core';
import { AppUser, UserRole } from '../../../auth/domain/auth.models';
import { WorkspaceRepository } from '../../application/workspace.repository';
import { DashboardAlert, DashboardSummary, InviteUserInput, ManagedUser, ManagedUserStatus } from '../../domain/workspace.models';

export class DemoWorkspaceRepository extends WorkspaceRepository {
  private readonly dashboardState = signal<DashboardSummary>({
    medicineCount: 6,
    totalUnits: 814,
    lowStockCount: 3,
    expiringLotCount: 2,
    monthlyConsumption: [
      { label: 'Jun', units: 2280 }, { label: 'Jul', units: 2610 }, { label: 'Ago', units: 2490 },
      { label: 'Set', units: 3180 }, { label: 'Out', units: 2920 }, { label: 'Nov', units: 3460 },
    ],
  });
  private readonly alertState = signal<DashboardAlert[]>([
    { id: 'alert-1', title: 'Estoque crítico', description: 'Amoxicilina 500 mg · 82 un.', severity: 'critical', medicationId: 'med-1' },
    { id: 'alert-2', title: 'Validade próxima', description: 'Omeprazol 20 mg · lote OMP-24107', severity: 'warning', lotCode: 'OMP-24107' },
    { id: 'alert-3', title: 'Reposição a avaliar', description: 'Soro fisiológico 0,9% abaixo do mínimo', severity: 'info', medicationId: 'med-4' },
  ]);
  private readonly userState = signal<ManagedUser[]>([
    { id: 'demo-pharmacy', name: 'Maria Silva', email: 'maria@hospital.test', role: 'farmacia', unit: 'Unidade central', status: 'active' },
    { id: 'demo-manager', name: 'Paulo Gestor', email: 'gestao@hospital.test', role: 'gestao', unit: 'Unidade central', status: 'active' },
    { id: 'demo-ana', name: 'Ana Costa', email: 'ana@hospital.test', role: 'farmacia', unit: 'Unidade central', status: 'active' },
  ]);

  readonly dashboard: Signal<DashboardSummary | null> = this.dashboardState.asReadonly();
  readonly alerts: Signal<DashboardAlert[]> = this.alertState.asReadonly();
  readonly users: Signal<ManagedUser[]> = this.userState.asReadonly();

  constructor(private readonly currentUser: () => AppUser | null) { super(); }

  async loadDashboard(days: number): Promise<void> {
    const months = Math.max(1, Math.ceil(days / 30));
    this.dashboardState.update((summary) => ({
      ...summary,
      monthlyConsumption: summary.monthlyConsumption.slice(-months),
    }));
  }

  async loadAlerts(): Promise<void> {}
  async loadUsers(): Promise<void> {}

  async inviteUser(input: InviteUserInput): Promise<void> {
    const email = input.email.trim().toLocaleLowerCase('pt-BR');
    if (!email.includes('@')) throw new Error('Informe um e-mail válido.');
    if (!input.unit.trim()) throw new Error('Informe a unidade de acesso.');
    if (this.userState().some((user) => user.email.toLocaleLowerCase('pt-BR') === email)) throw new Error('Já existe um usuário com esse e-mail.');
    this.userState.update((users) => [...users, {
      id: `invite-${Date.now()}`, name: email.split('@')[0], email, role: input.role,
      unit: input.unit.trim(), status: 'invited',
    }]);
  }

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    if (this.currentUser()?.id === userId) throw new Error('Não é possível alterar o próprio perfil.');
    this.userState.update((users) => users.map((user) => user.id === userId ? { ...user, role } : user));
  }

  async setUserStatus(userId: string, status: ManagedUserStatus): Promise<void> {
    if (this.currentUser()?.id === userId && status !== 'active') throw new Error('Não é possível desativar a própria conta.');
    this.userState.update((users) => users.map((user) => user.id === userId ? { ...user, status } : user));
  }
}

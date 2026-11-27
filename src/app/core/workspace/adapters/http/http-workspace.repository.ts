import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, Signal, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UserRole } from '../../../auth/domain/auth.models';
import { WorkspaceRepository } from '../../application/workspace.repository';
import { AlertSeverity, DashboardAlert, DashboardSummary, InviteUserInput, ManagedUser, ManagedUserStatus } from '../../domain/workspace.models';

interface ApiDashboardSummary {
  medicamentosCadastrados: number;
  unidadesEmEstoque: number;
  estoqueAbaixoDoMinimo: number;
  lotesProximosDaValidade: number;
  consumoMensal: { mes: string; unidades: number }[];
}
interface ApiAlert {
  id: string;
  titulo: string;
  descricao: string;
  severidade: 'CRITICO' | 'ATENCAO' | 'INFO';
  medicamentoId?: string;
  loteCodigo?: string;
}
interface ApiUser {
  id: string;
  nome: string;
  email: string;
  papel: UserRole;
  unidade: string;
  status: 'ATIVO' | 'CONVITE_PENDENTE' | 'INATIVO';
}
interface ApiPage<T> { itens: T[]; }

@Injectable({ providedIn: 'root' })
export class HttpWorkspaceRepository extends WorkspaceRepository {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly dashboardState = signal<DashboardSummary | null>(null);
  private readonly alertState = signal<DashboardAlert[]>([]);
  private readonly userState = signal<ManagedUser[]>([]);
  readonly dashboard: Signal<DashboardSummary | null> = this.dashboardState.asReadonly();
  readonly alerts: Signal<DashboardAlert[]> = this.alertState.asReadonly();
  readonly users: Signal<ManagedUser[]> = this.userState.asReadonly();

  constructor(private readonly http: HttpClient) { super(); }

  async loadDashboard(days: number): Promise<void> {
    try {
      const summary = await firstValueFrom(this.http.get<ApiDashboardSummary>(`${this.baseUrl}/dashboard/resumo`, { params: { dias: days } }));
      this.dashboardState.set({
        medicineCount: summary.medicamentosCadastrados,
        totalUnits: summary.unidadesEmEstoque,
        lowStockCount: summary.estoqueAbaixoDoMinimo,
        expiringLotCount: summary.lotesProximosDaValidade,
        monthlyConsumption: summary.consumoMensal.map((point) => ({ label: point.mes, units: point.unidades })),
      });
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível carregar o resumo do dashboard.');
    }
  }

  async loadAlerts(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<ApiPage<ApiAlert> | ApiAlert[]>(`${this.baseUrl}/alertas`, { params: { limite: 10 } }));
      const items = Array.isArray(response) ? response : response.itens;
      this.alertState.set(items.map((item) => ({
        id: item.id,
        title: item.titulo,
        description: item.descricao,
        severity: this.toSeverity(item.severidade),
        medicationId: item.medicamentoId,
        lotCode: item.loteCodigo,
      })));
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível carregar os alertas do estoque.');
    }
  }

  async loadUsers(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<ApiPage<ApiUser> | ApiUser[]>(`${this.baseUrl}/usuarios`, {
        params: new HttpParams().set('pagina', 1).set('tamanho', 100),
      }));
      const items = Array.isArray(response) ? response : response.itens;
      this.userState.set(items.map((item) => this.toManagedUser(item)));
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível carregar os usuários da unidade.');
    }
  }

  async inviteUser(input: InviteUserInput): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/usuarios`, {
        email: input.email.trim(), papel: input.role, unidade: input.unit.trim(),
      }));
      await this.loadUsers();
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível convidar o usuário.');
    }
  }

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(`${this.baseUrl}/usuarios/${encodeURIComponent(userId)}`, { papel: role }));
      await this.loadUsers();
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível alterar o perfil do usuário.');
    }
  }

  async setUserStatus(userId: string, status: ManagedUserStatus): Promise<void> {
    try {
      await firstValueFrom(this.http.patch(`${this.baseUrl}/usuarios/${encodeURIComponent(userId)}/status`, { status: this.toApiStatus(status) }));
      await this.loadUsers();
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível atualizar o acesso do usuário.');
    }
  }

  private toManagedUser(item: ApiUser): ManagedUser {
    const status: Record<ApiUser['status'], ManagedUserStatus> = {
      ATIVO: 'active', CONVITE_PENDENTE: 'invited', INATIVO: 'disabled',
    };
    return { id: item.id, name: item.nome, email: item.email, role: item.papel, unit: item.unidade, status: status[item.status] };
  }

  private toApiStatus(status: ManagedUserStatus): ApiUser['status'] {
    const values: Record<ManagedUserStatus, ApiUser['status']> = { active: 'ATIVO', invited: 'CONVITE_PENDENTE', disabled: 'INATIVO' };
    return values[status];
  }

  private toSeverity(severity: ApiAlert['severidade']): AlertSeverity {
    const values: Record<ApiAlert['severidade'], AlertSeverity> = { CRITICO: 'critical', ATENCAO: 'warning', INFO: 'info' };
    return values[severity];
  }

  private toUserError(error: unknown, fallback: string): Error {
    const response = (error as { error?: { erro?: { mensagem?: string }; message?: string } })?.error;
    return new Error(response?.erro?.mensagem ?? response?.message ?? fallback);
  }
}

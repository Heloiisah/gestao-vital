import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { LucideCircleHelp } from '@lucide/angular';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserRole } from '../../../../core/auth/domain/auth.models';
import { WorkspaceRepository } from '../../../../core/workspace/application/workspace.repository';
import { ManagedUser, ManagedUserStatus } from '../../../../core/workspace/domain/workspace.models';

@Component({ selector: 'app-access-page', standalone: true, imports: [CommonModule, FormsModule, LucideCircleHelp], templateUrl: './access-page.html' })
export class AccessPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceRepository);
  protected readonly user = this.auth.user;
  protected readonly demoMode = this.auth.isDemo;
  protected readonly users = this.workspace.users;
  protected readonly canManage = computed(() => this.user()?.role === 'gestao');
  protected readonly email = signal('');
  protected readonly inviteRole = signal<UserRole>('farmacia');
  protected readonly unit = signal('Unidade central');
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly notice = signal('');

  constructor() {
    if (this.canManage() && !this.demoMode) void this.loadUsers();
  }

  protected switchRole(role: UserRole): void { this.auth.useDemoRole(role); }
  protected async logout(): Promise<void> {
    await this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  protected async invite(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.workspace.inviteUser({ email: this.email(), role: this.inviteRole(), unit: this.unit() });
      this.email.set('');
      this.notice.set('Convite enviado.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível enviar o convite.');
    } finally { this.saving.set(false); }
  }

  protected async changeRole(user: ManagedUser, role: string): Promise<void> {
    if (role !== 'farmacia' && role !== 'gestao') return;
    await this.updateUser(() => this.workspace.updateUserRole(user.id, role));
  }

  protected async changeStatus(user: ManagedUser): Promise<void> {
    const status: ManagedUserStatus = user.status === 'active' ? 'disabled' : 'active';
    await this.updateUser(() => this.workspace.setUserStatus(user.id, status));
  }

  protected statusLabel(status: ManagedUserStatus): string {
    return status === 'active' ? 'Ativo' : status === 'invited' ? 'Convite pendente' : 'Inativo';
  }

  private async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try { await this.workspace.loadUsers(); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar usuários.'); }
    finally { this.loading.set(false); }
  }

  private async updateUser(action: () => Promise<void>): Promise<void> {
    this.error.set('');
    this.notice.set('');
    try { await action(); this.notice.set('Acesso atualizado.'); }
    catch (error) { this.error.set(error instanceof Error ? error.message : 'Não foi possível atualizar o acesso.'); }
  }
}

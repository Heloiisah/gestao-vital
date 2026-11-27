import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceUiState } from '../../../../core/layout/workspace-ui-state.service';
import { InventoryRepository } from '../../application/ports/inventory.repository';

@Component({ selector: 'app-movements-page', standalone: true, imports: [CommonModule], templateUrl: './movements-page.html' })
export class MovementsPage {
  protected readonly ui = inject(WorkspaceUiState);
  private readonly repository = inject(InventoryRepository);
  private readonly auth = inject(AuthService);
  protected readonly canOperateStock = computed(() => this.auth.user()?.role === 'farmacia');
  protected readonly filtered = computed(() => {
    const term = this.ui.query().trim().toLocaleLowerCase('pt-BR');
    return this.repository.movements().filter((movement) => `${movement.medicine} ${movement.person} ${movement.kind}`.toLocaleLowerCase('pt-BR').includes(term));
  });
}

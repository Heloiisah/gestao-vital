import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceUiState } from '../../../../core/layout/workspace-ui-state.service';
import { InventoryRepository } from '../../application/ports/inventory.repository';
import { MovementKind, MovementPage, MovementSearch } from '../../domain/inventory.models';
import { PageSkeleton } from '../../../../shared/ui/page-skeleton/page-skeleton';

@Component({ selector: 'app-movements-page', standalone: true, imports: [CommonModule, FormsModule, PageSkeleton], templateUrl: './movements-page.html' })
export class MovementsPage {
  protected readonly ui = inject(WorkspaceUiState);
  private readonly repository = inject(InventoryRepository);
  private readonly auth = inject(AuthService);
  protected readonly canOperateStock = computed(() => this.auth.user()?.role === 'farmacia');
  protected readonly kind = signal<MovementKind | 'Todos'>('Todos');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly pageSize = signal(20);
  protected readonly page = signal<MovementPage>({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  private requestSequence = 0;
  private firstQueryEffect = true;
  private firstMovementEffect = true;

  constructor() {
    void this.loadPage(1);
    effect((onCleanup) => {
      this.ui.query();
      if (this.firstQueryEffect) { this.firstQueryEffect = false; return; }
      const timer = setTimeout(() => void this.loadPage(1), 300);
      onCleanup(() => clearTimeout(timer));
    });
    effect((onCleanup) => {
      this.repository.movements();
      if (this.firstMovementEffect) { this.firstMovementEffect = false; return; }
      const timer = setTimeout(() => void this.loadPage(this.page().page), 0);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected applyFilters(): void {
    if (this.from() && this.to() && this.from() > this.to()) {
      this.error.set('A data inicial deve ser anterior à data final.');
      return;
    }
    void this.loadPage(1);
  }
  protected setPageSize(value: string): void {
    const size = Number(value);
    if ([10, 20, 50, 100].includes(size)) {
      this.pageSize.set(size);
      void this.loadPage(1);
    }
  }
  protected previousPage(): void { if (this.page().page > 1) void this.loadPage(this.page().page - 1); }
  protected nextPage(): void { if (this.page().page < this.page().totalPages) void this.loadPage(this.page().page + 1); }

  private async loadPage(pageNumber: number): Promise<void> {
    const requestId = ++this.requestSequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.repository.searchMovements({ ...this.filter(), page: pageNumber, pageSize: this.pageSize() });
      if (requestId === this.requestSequence) this.page.set(result);
    } catch (error) {
      if (requestId === this.requestSequence) this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.');
    } finally {
      if (requestId === this.requestSequence) this.loading.set(false);
    }
  }

  private filter(): Omit<MovementSearch, 'page' | 'pageSize'> {
    return { search: this.ui.query(), kind: this.kind(), from: this.from(), to: this.to() };
  }
}

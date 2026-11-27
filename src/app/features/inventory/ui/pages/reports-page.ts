import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideArrowDownToLine, LucideArrowRight, LucideChartNoAxesCombined, LucidePackage, LucideArrowRightLeft } from '@lucide/angular';
import { WorkspaceUiState } from '../../../../core/layout/workspace-ui-state.service';
import { InventoryRepository } from '../../application/ports/inventory.repository';
import { Movement, MovementKind, MovementPage, MovementSearch } from '../../domain/inventory.models';
import { PageSkeleton } from '../../../../shared/ui/page-skeleton/page-skeleton';

@Component({ selector: 'app-reports-page', standalone: true, imports: [CommonModule, FormsModule, RouterLink, PageSkeleton, LucideArrowDownToLine, LucideArrowRight, LucideArrowRightLeft, LucideChartNoAxesCombined, LucidePackage], templateUrl: './reports-page.html' })
export class ReportsPage {
  protected readonly ui = inject(WorkspaceUiState);
  private readonly repository = inject(InventoryRepository);
  protected readonly search = signal('');
  protected readonly kind = signal<MovementKind | 'Todos'>('Todos');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly pageSize = signal(20);
  protected readonly page = signal<MovementPage>({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 });
  protected readonly loading = signal(false);
  protected readonly exporting = signal(false);
  protected readonly error = signal('');
  private requestSequence = 0;

  constructor() { void this.loadPage(1); }

  protected applyFilters(): void { void this.loadPage(1); }
  protected setPageSize(value: string): void {
    const size = Number(value);
    if ([10, 20, 50, 100].includes(size)) {
      this.pageSize.set(size);
      void this.loadPage(1);
    }
  }
  protected previousPage(): void { if (this.page().page > 1) void this.loadPage(this.page().page - 1); }
  protected nextPage(): void { if (this.page().page < this.page().totalPages) void this.loadPage(this.page().page + 1); }

  protected async exportAll(): Promise<void> {
    this.exporting.set(true);
    this.error.set('');
    try {
      const movements = await this.repository.exportMovements(this.filter());
      const rows = [['Medicamento', 'Tipo', 'Lote', 'Quantidade', 'Data', 'Responsável', 'Motivo'], ...movements.map((item) => [item.medicine, item.kind, item.lot, String(item.quantity), item.date, item.person, item.reason])];
      const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\r\n');
      const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'gestao-vital-movimentacoes.csv';
      link.click();
      URL.revokeObjectURL(url);
      this.ui.notify(`Exportação concluída: ${movements.length} registros.`);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível exportar as movimentações.');
    } finally { this.exporting.set(false); }
  }

  private async loadPage(pageNumber: number): Promise<void> {
    const requestId = ++this.requestSequence;
    this.loading.set(true);
    this.error.set('');
    try {
      const result = await this.repository.searchMovements({ ...this.filter(), page: pageNumber, pageSize: this.pageSize() });
      if (requestId === this.requestSequence) this.page.set(result);
    } catch (error) {
      if (requestId === this.requestSequence) this.error.set(error instanceof Error ? error.message : 'Não foi possível carregar o relatório.');
    } finally {
      if (requestId === this.requestSequence) this.loading.set(false);
    }
  }

  private filter(): Omit<MovementSearch, 'page' | 'pageSize'> {
    return { search: this.search(), kind: this.kind(), from: this.from(), to: this.to() };
  }
}

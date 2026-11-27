import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LucideCircleHelp } from '@lucide/angular';
import { InventoryRepository } from '../../application/ports/inventory.repository';
import { WorkspaceUiState } from '../../../../core/layout/workspace-ui-state.service';
import { addDaysToDateOnly, toLocalDateOnly } from '../../../../shared/utils/date-only';

@Component({ selector: 'app-stock-page', standalone: true, imports: [CommonModule, LucideCircleHelp], templateUrl: './stock-page.html' })
export class StockPage {
  protected readonly ui = inject(WorkspaceUiState);
  private readonly repository = inject(InventoryRepository);
  protected readonly availableUnits = computed(() => this.repository.medicines().reduce((sum, medicine) => sum + medicine.stock, 0));
  protected readonly lowStockCount = computed(() => this.repository.medicines().filter((medicine) => medicine.status !== 'Regular').length);
  protected readonly expiringCount = computed(() => {
    const today = toLocalDateOnly();
    const limit = addDaysToDateOnly(today, 30);
    return this.repository.lots().filter((lot) => lot.quantity > 0 && lot.expiry >= today && lot.expiry <= limit).length;
  });
  protected readonly filtered = computed(() => {
    const term = this.ui.query().trim().toLocaleLowerCase('pt-BR');
    return this.repository.lots().filter((lot) => `${lot.medicine} ${lot.lot} ${lot.location}`.toLocaleLowerCase('pt-BR').includes(term));
  });
}

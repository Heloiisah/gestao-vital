import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { WorkspaceUiState } from '../../../../core/layout/workspace-ui-state.service';
import { InventoryRepository } from '../../application/ports/inventory.repository';

@Component({ selector: 'app-medicines-page', standalone: true, imports: [CommonModule], templateUrl: './medicines-page.html' })
export class MedicinesPage {
  protected readonly ui = inject(WorkspaceUiState);
  private readonly repository = inject(InventoryRepository);
  protected readonly filtered = computed(() => {
    const term = this.ui.query().trim().toLocaleLowerCase('pt-BR');
    return this.repository.medicines().filter((medicine) => `${medicine.name} ${medicine.ingredient}`.toLocaleLowerCase('pt-BR').includes(term));
  });
}

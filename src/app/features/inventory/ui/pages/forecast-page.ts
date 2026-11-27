import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { LucideChartNoAxesCombined } from '@lucide/angular';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceUiState } from '../../../../core/layout/workspace-ui-state.service';
import { InventoryRepository } from '../../application/ports/inventory.repository';
import { PageSkeleton } from '../../../../shared/ui/page-skeleton/page-skeleton';

@Component({ selector: 'app-forecast-page', standalone: true, imports: [CommonModule, LucideChartNoAxesCombined, PageSkeleton], templateUrl: './forecast-page.html' })
export class ForecastPage {
  protected readonly ui = inject(WorkspaceUiState);
  private readonly repository = inject(InventoryRepository);
  protected readonly demoMode = inject(AuthService).isDemo;
  protected readonly forecast = computed(() => this.repository.forecasts()[0] ?? null);
}

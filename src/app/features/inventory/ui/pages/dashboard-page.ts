import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideArrowRightLeft, LucideBell, LucideCalendarDays, LucideChartColumnIncreasing, LucideChartNoAxesCombined, LucideCircleAlert, LucideCircleCheck, LucideCircleHelp, LucideClock, LucideLightbulb, LucidePackage, LucidePill, LucideTrendingUp, LucideTriangleAlert, LucideX } from '@lucide/angular';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceUiState } from '../../../../core/layout/workspace-ui-state.service';
import { InventoryRepository } from '../../application/ports/inventory.repository';
import { addDaysToDateOnly, toLocalDateOnly } from '../../../../shared/utils/date-only';
import { PageSkeleton } from '../../../../shared/ui/page-skeleton/page-skeleton';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageSkeleton, LucideArrowRight, LucideArrowRightLeft, LucideBell, LucideCalendarDays, LucideChartColumnIncreasing, LucideChartNoAxesCombined, LucideCircleAlert, LucideCircleCheck, LucideCircleHelp, LucideClock, LucideLightbulb, LucidePackage, LucidePill, LucideTrendingUp, LucideTriangleAlert, LucideX],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly repository = inject(InventoryRepository);
  private readonly auth = inject(AuthService);
  protected readonly ui = inject(WorkspaceUiState);
  protected readonly demoMode = this.auth.isDemo;
  protected readonly canOperateStock = computed(() => this.auth.user()?.role === 'farmacia');
  protected readonly medicines = this.repository.medicines;
  protected readonly movements = this.repository.movements;
  protected readonly registeredCount = computed(() => this.medicines().length);
  protected readonly availableUnits = computed(() => this.medicines().reduce((sum, item) => sum + item.stock, 0));
  protected readonly lowStockCount = computed(() => this.medicines().filter((item) => item.status !== 'Regular').length);
  protected readonly expiringLotCount = computed(() => {
    const today = toLocalDateOnly();
    const limit = addDaysToDateOnly(today, 30);
    return this.repository.lots().filter((lot) => lot.quantity > 0 && lot.expiry >= today && lot.expiry <= limit).length;
  });
  protected readonly forecast = computed(() => this.repository.forecasts()[0] ?? null);
  protected readonly periodLabel = computed(() => ({ 30: '30 dias', 90: '3 meses', 180: '6 meses', 365: '12 meses' } as Record<number, string>)[this.ui.period()] ?? '30 dias');
}

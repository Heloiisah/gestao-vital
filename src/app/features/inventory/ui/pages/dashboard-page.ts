import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideArrowRightLeft, LucideBell, LucideCalendarDays, LucideChartColumnIncreasing, LucideChartNoAxesCombined, LucideCircleAlert, LucideCircleHelp, LucideLightbulb, LucidePackage, LucidePill, LucideTrendingUp, LucideTriangleAlert, LucideX } from '@lucide/angular';
import { AuthService } from '../../../../core/auth/auth.service';
import { WorkspaceUiState } from '../../../../core/layout/workspace-ui-state.service';
import { InventoryRepository } from '../../application/ports/inventory.repository';
import { WorkspaceRepository } from '../../../../core/workspace/application/workspace.repository';
import { DashboardAlert } from '../../../../core/workspace/domain/workspace.models';
import { addDaysToDateOnly, toLocalDateOnly } from '../../../../shared/utils/date-only';
import { PageSkeleton } from '../../../../shared/ui/page-skeleton/page-skeleton';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink, PageSkeleton, LucideArrowRight, LucideArrowRightLeft, LucideBell, LucideCalendarDays, LucideChartColumnIncreasing, LucideChartNoAxesCombined, LucideCircleAlert, LucideCircleHelp, LucideLightbulb, LucidePackage, LucidePill, LucideTrendingUp, LucideTriangleAlert, LucideX],
  templateUrl: './dashboard-page.html',
})
export class DashboardPage {
  private readonly repository = inject(InventoryRepository);
  private readonly workspace = inject(WorkspaceRepository);
  private readonly auth = inject(AuthService);
  protected readonly ui = inject(WorkspaceUiState);
  protected readonly demoMode = this.auth.isDemo;
  protected readonly canOperateStock = computed(() => this.auth.user()?.role === 'farmacia');
  protected readonly medicines = this.repository.medicines;
  protected readonly movements = this.repository.movements;
  protected readonly dashboard = this.workspace.dashboard;
  protected readonly alerts = this.workspace.alerts;
  protected readonly registeredCount = computed(() => this.demoMode ? this.medicines().length : this.dashboard()?.medicineCount ?? this.medicines().length);
  protected readonly availableUnits = computed(() => this.demoMode ? this.medicines().reduce((sum, item) => sum + item.stock, 0) : this.dashboard()?.totalUnits ?? this.medicines().reduce((sum, item) => sum + item.stock, 0));
  protected readonly lowStockCount = computed(() => this.demoMode ? this.medicines().filter((item) => item.status !== 'Regular').length : this.dashboard()?.lowStockCount ?? this.medicines().filter((item) => item.status !== 'Regular').length);
  protected readonly expiringLotCount = computed(() => {
    const summaryCount = this.dashboard()?.expiringLotCount;
    if (!this.demoMode && summaryCount !== undefined) return summaryCount;
    const today = toLocalDateOnly();
    const limit = addDaysToDateOnly(today, 30);
    return this.repository.lots().filter((lot) => lot.quantity > 0 && lot.expiry >= today && lot.expiry <= limit).length;
  });
  protected readonly monthlyConsumption = computed(() => this.dashboard()?.monthlyConsumption ?? []);
  protected readonly chartPath = computed(() => {
    const points = this.monthlyConsumption();
    if (!points.length) return '';
    const max = Math.max(...points.map((point) => point.units), 1);
    if (points.length === 1) {
      const y = Math.round(170 - (points[0].units / max) * 120);
      return `M 8 ${y} L 592 ${y}`;
    }
    return points.map((point, index) => {
      const x = Math.round(8 + (584 * index) / (points.length - 1));
      const y = Math.round(170 - (point.units / max) * 120);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  });
  protected readonly chartFillPath = computed(() => this.chartPath() ? `${this.chartPath()} L 592 180 L 8 180 Z` : '');
  protected readonly chartLabels = computed(() => this.monthlyConsumption().map((point) => point.label));
  protected readonly forecast = computed(() => this.repository.forecasts()[0] ?? null);
  protected readonly periodLabel = computed(() => ({ 30: '30 dias', 90: '3 meses', 180: '6 meses', 365: '12 meses' } as Record<number, string>)[this.ui.period()] ?? '30 dias');

  protected alertClass(alert: DashboardAlert): string {
    return alert.severity === 'critical' ? 'alert-critical' : alert.severity === 'warning' ? 'alert-warning' : 'alert-info';
  }
  protected alertLabel(alert: DashboardAlert): string {
    return alert.severity === 'critical' ? 'Crítico' : alert.severity === 'warning' ? 'Em breve' : 'Informativo';
  }
}

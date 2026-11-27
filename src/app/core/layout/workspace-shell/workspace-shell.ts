import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import {
  LucideArrowDownToLine, LucideArrowRight, LucideArrowUpFromLine, LucideBell,
  LucideBoxes, LucideBuildingComplex, LucideCalendarDays, LucideChartColumnIncreasing,
  LucideChartNoAxesCombined, LucideCheck, LucideChevronDown, LucideCircleHelp,
  LucideFileText, LucideHeartPulse, LucideLayoutDashboard, LucidePackage, LucidePill,
  LucidePlus, LucideSearch, LucideSettings, LucideUserRound, LucideUsers,
} from '@lucide/angular';
import { AuthService } from '../../auth/auth.service';
import { WorkspaceUiState } from '../workspace-ui-state.service';
import { InventoryRepository } from '../../../features/inventory/application/ports/inventory.repository';
import { MovementKind } from '../../../features/inventory/domain/inventory.models';
import { MedicineDialogComponent } from '../../../features/inventory/ui/medicine-dialog/medicine-dialog';
import { MovementDialogComponent } from '../../../features/inventory/ui/movement-dialog/movement-dialog';
import { PageSkeleton } from '../../../shared/ui/page-skeleton/page-skeleton';

type PageKey = 'dashboard' | 'medicamentos' | 'estoque' | 'movimentacoes' | 'previsoes' | 'relatorios' | 'acessos';

@Component({
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MedicineDialogComponent, MovementDialogComponent, PageSkeleton,
    LucideArrowDownToLine, LucideArrowRight, LucideArrowUpFromLine, LucideBell, LucideBoxes, LucideBuildingComplex,
    LucideCalendarDays, LucideChartColumnIncreasing, LucideChartNoAxesCombined, LucideCheck, LucideChevronDown,
    LucideCircleHelp, LucideFileText, LucideHeartPulse, LucideLayoutDashboard, LucidePackage, LucidePill,
    LucidePlus, LucideSearch, LucideSettings, LucideUserRound, LucideUsers],
  selector: 'app-workspace-shell',
  styleUrl: './workspace-shell.scss',
  templateUrl: './workspace-shell.html',
})
export class WorkspaceShell {
  private readonly repository = inject(InventoryRepository);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  protected readonly ui = inject(WorkspaceUiState);
  protected readonly user = this.auth.user;
  protected readonly demoMode = this.auth.isDemo;
  protected readonly dataLoading = signal(false);
  private readonly routePath = signal(this.router.url);
  protected readonly activePage = computed(() => (this.routePath().split(/[/?#]/).filter(Boolean).at(-1) ?? 'dashboard') as PageKey);
  protected readonly pageTitle = computed(() => ({ dashboard: 'Dashboard', medicamentos: 'Medicamentos', estoque: 'Lotes e estoque', movimentacoes: 'Movimentações', previsoes: 'Consumo e previsões', relatorios: 'Relatórios', acessos: 'Pessoas e acessos' } as Record<PageKey, string>)[this.activePage()] ?? 'Dashboard');
  protected readonly lowStockCount = computed(() => this.repository.medicines().filter((item) => item.status !== 'Regular').length);
  protected readonly canOperateStock = computed(() => this.user()?.role === 'farmacia');
  protected readonly skeletonVariant = computed(() => this.activePage() === 'dashboard' ? 'dashboard' : this.activePage() === 'previsoes' ? 'forecast' : 'table');

  constructor() {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe((event) => {
        this.routePath.set(event.urlAfterRedirects);
        this.ui.showNotifications.set(false);
        this.ui.query.set('');
      });
    if (this.user()) void this.loadData();
  }

  protected openMovement(kind: MovementKind = 'Saída'): void { this.ui.openMovement(kind); }
  protected notify(message: string): void { this.ui.notify(message); }

  protected async setForecastPeriod(value: string | number): Promise<void> {
    const days = Number(value);
    if (![30, 90, 180, 365].includes(days)) return;
    this.ui.period.set(days);
    this.ui.forecastLoading.set(true);
    try { await this.repository.refreshForecast(days); }
    catch (error) { this.ui.notify(error instanceof Error ? error.message : 'Previsões indisponíveis.'); }
    finally { this.ui.forecastLoading.set(false); }
  }

  private async loadData(): Promise<void> {
    this.dataLoading.set(!this.demoMode);
    try { await Promise.all([this.repository.load(), this.repository.refreshForecast(this.ui.period())]); }
    catch (error) { this.ui.notify(error instanceof Error ? error.message : 'Não foi possível carregar os dados.'); }
    finally { this.dataLoading.set(false); }
  }
}

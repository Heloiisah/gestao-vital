import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  LucideArrowDownToLine, LucideArrowRight, LucideArrowUpFromLine, LucideBell,
  LucideBuildingComplex,
  LucideBoxes, LucideCalendarDays, LucideChartColumnIncreasing,
  LucideChartNoAxesCombined, LucideCheck, LucideChevronDown,
  LucideCircleAlert, LucideCircleHelp, LucideClock,
  LucideFileText, LucideHeartPulse, LucideLayoutDashboard, LucideLightbulb,
  LucidePackage, LucidePill, LucidePlus, LucideSearch, LucideSettings,
  LucideTriangleAlert, LucideTrendingUp, LucideUserRound, LucideUsers, LucideX,
} from '@lucide/angular';
import { InventoryRepository } from './features/inventory/application/ports/inventory.repository';
import { MovementKind } from './features/inventory/domain/inventory.models';
import { AuthService } from './core/auth/auth.service';
import { AppUser, UserRole } from './core/auth/domain/auth.models';
import { MovementDialogComponent } from './features/inventory/ui/movement-dialog/movement-dialog';
import { MedicineDialogComponent } from './features/inventory/ui/medicine-dialog/medicine-dialog';
import { PageSkeleton } from './shared/ui/page-skeleton/page-skeleton';

type PageKey = 'dashboard' | 'medicamentos' | 'estoque' | 'movimentacoes' | 'previsoes' | 'relatorios' | 'acessos';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule, FormsModule, MedicineDialogComponent, MovementDialogComponent, PageSkeleton, LucideArrowDownToLine, LucideArrowRight,
    LucideArrowUpFromLine, LucideBell, LucideBoxes, LucideBuildingComplex, LucideCalendarDays,
    LucideChartColumnIncreasing, LucideChartNoAxesCombined, LucideCheck,
    LucideChevronDown, LucideCircleAlert, LucideCircleHelp,
    LucideClock, LucideFileText, LucideHeartPulse, LucideLayoutDashboard,
    LucideLightbulb, LucidePackage, LucidePill, LucidePlus, LucideSearch,
    LucideSettings, LucideTriangleAlert, LucideTrendingUp, LucideUserRound, LucideUsers, LucideX,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly repository = inject(InventoryRepository);
  private readonly auth = inject(AuthService);
  protected readonly user = this.auth.user;
  protected readonly demoMode = this.auth.isDemo;
  protected readonly todayDate = new Date().toISOString().slice(0, 10);
  protected readonly medicines = this.repository.medicines;
  protected readonly lots = this.repository.lots;
  protected readonly movements = this.repository.movements;
  protected readonly forecasts = this.repository.forecasts;
  protected readonly activePage = signal<PageKey>('dashboard');
  protected readonly query = signal('');
  protected readonly period = signal(30);
  protected readonly showNotifications = signal(false);
  protected readonly showDemoNotice = signal(true);
  protected readonly showMovementForm = signal(false);
  protected readonly showMedicineForm = signal(false);
  protected readonly dataLoading = signal(false);
  protected readonly forecastLoading = signal(false);
  protected readonly toast = signal('');
  protected readonly movementKind = signal<MovementKind>('Saída');
  protected readonly loginEmail = signal('');
  protected readonly loginPassword = signal('');
  protected readonly loginError = signal('');
  protected readonly reportSearch = signal('');
  protected readonly reportKind = signal('Todos');
  protected readonly reportFrom = signal('');
  protected readonly reportTo = signal('');

  protected readonly pages: { key: PageKey; label: string; icon: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: '▦' },
    { key: 'medicamentos', label: 'Medicamentos', icon: '◉' },
    { key: 'estoque', label: 'Lotes e estoque', icon: '▣' },
    { key: 'movimentacoes', label: 'Movimentações', icon: '↕' },
    { key: 'previsoes', label: 'Consumo e previsões', icon: '⌁' },
    { key: 'relatorios', label: 'Relatórios', icon: '▤' },
    { key: 'acessos', label: 'Acessos', icon: '♙' },
  ];

  protected readonly filteredMedicines = computed(() => {
    const term = this.query().trim().toLocaleLowerCase('pt-BR');
    return this.medicines().filter((medicine) =>
      `${medicine.name} ${medicine.ingredient}`.toLocaleLowerCase('pt-BR').includes(term),
    );
  });

  protected readonly filteredMovements = computed(() => {
    const term = this.query().trim().toLocaleLowerCase('pt-BR');
    return this.movements().filter((movement) =>
      `${movement.medicine} ${movement.person} ${movement.kind}`.toLocaleLowerCase('pt-BR').includes(term),
    );
  });

  protected readonly filteredLots = computed(() => {
    const term = this.query().trim().toLocaleLowerCase('pt-BR');
    return this.lots().filter((lot) =>
      `${lot.medicine} ${lot.lot} ${lot.location}`.toLocaleLowerCase('pt-BR').includes(term),
    );
  });
  protected readonly filteredReportMovements = computed(() => {
    const term = this.reportSearch().trim().toLocaleLowerCase('pt-BR');
    return this.movements().filter((item) => {
      const matchesTerm = `${item.medicine} ${item.person} ${item.reason} ${item.lot}`.toLocaleLowerCase('pt-BR').includes(term);
      const matchesKind = this.reportKind() === 'Todos' || item.kind === this.reportKind();
      const date = item.date.slice(0, 10);
      const matchesFrom = !this.reportFrom() || date >= this.reportFrom();
      const matchesTo = !this.reportTo() || date <= this.reportTo();
      return matchesTerm && matchesKind && matchesFrom && matchesTo;
    });
  });

  protected readonly pageTitle = computed(() => this.pages.find((page) => page.key === this.activePage())?.label ?? 'Visão geral');
  protected readonly periodLabel = computed(() => ({ 30: '30 dias', 90: '3 meses', 180: '6 meses', 365: '12 meses' } as Record<number, string>)[this.period()] ?? '30 dias');
  protected readonly registeredCount = computed(() => this.medicines().length);
  protected readonly availableUnits = computed(() => this.medicines().reduce((sum, medicine) => sum + medicine.stock, 0));
  protected readonly lowStockCount = computed(() => this.medicines().filter((medicine) => medicine.status !== 'Regular').length);
  protected readonly expiringLotCount = computed(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + 30);
    const dateLimit = limit.toISOString().slice(0, 10);
    return this.lots().filter((lot) => lot.quantity > 0 && lot.expiry >= this.todayDate && lot.expiry <= dateLimit).length;
  });
  protected readonly forecast = computed(() => this.forecasts()[0] ?? null);

  constructor() {
    if (this.user()) this.loadData();
  }

  protected navigate(page: PageKey): void {
    this.activePage.set(page);
    this.query.set('');
    this.showNotifications.set(false);
  }

  protected openMovement(kind: MovementKind = 'Saída'): void {
    this.movementKind.set(kind);
    this.showMovementForm.set(true);
  }

  protected notify(message: string): void {
    this.flash(message);
  }

  protected closeOverlays(): void {
    this.showMovementForm.set(false);
    this.showMedicineForm.set(false);
  }

  protected async login(): Promise<void> {
    this.loginError.set('');
    try {
      await this.auth.login(this.loginEmail(), this.loginPassword());
      await this.loadData();
    } catch (error) {
      this.loginError.set(error instanceof Error ? error.message : 'Não foi possível entrar.');
    }
  }

  protected logout(): void {
    this.auth.logout();
    this.activePage.set('dashboard');
  }

  protected switchDemoRole(role: UserRole): void { this.auth.useDemoRole(role); }

  protected canOperateStock(): boolean { return this.user()?.role === 'farmacia'; }

  protected async setForecastPeriod(days: string | number): Promise<void> {
    const parsedDays = Number(days);
    if (![30, 90, 180, 365].includes(parsedDays)) return;
    this.period.set(parsedDays);
    this.forecastLoading.set(true);
    try { await this.repository.refreshForecast(parsedDays); }
    catch (error) { this.flash(error instanceof Error ? error.message : 'Previsões indisponíveis.'); }
    finally { this.forecastLoading.set(false); }
  }

  protected exportMovements(): void {
    const rows = [['Medicamento', 'Tipo', 'Lote', 'Quantidade', 'Data', 'Responsável', 'Motivo'], ...this.filteredReportMovements().map((item) => [item.medicine, item.kind, item.lot, String(item.quantity), item.date, item.person, item.reason])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'gestao-vital-movimentacoes.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  protected userName(user: AppUser | null): string { return user?.name ?? ''; }

  private async loadData(): Promise<void> {
    this.dataLoading.set(!this.demoMode);
    try {
      await Promise.all([this.repository.load(), this.repository.refreshForecast(this.period())]);
    } catch (error) {
      this.flash(error instanceof Error ? error.message : 'Não foi possível carregar os dados.');
    } finally {
      this.dataLoading.set(false);
    }
  }

  private flash(message: string): void {
    this.toast.set(message);
    window.setTimeout(() => this.toast.set(''), 3200);
  }
}

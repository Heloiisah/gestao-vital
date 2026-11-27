import { Routes } from '@angular/router';
import { authenticatedGuard, guestGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./core/auth/login-page/login-page').then((page) => page.LoginPage), canActivate: [guestGuard] },
  {
    path: '', loadComponent: () => import('./core/layout/workspace-shell/workspace-shell').then((layout) => layout.WorkspaceShell), canActivate: [authenticatedGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', loadComponent: () => import('./features/inventory/ui/pages/dashboard-page').then((page) => page.DashboardPage) },
      { path: 'medicamentos', loadComponent: () => import('./features/inventory/ui/pages/medicines-page').then((page) => page.MedicinesPage) },
      { path: 'estoque', loadComponent: () => import('./features/inventory/ui/pages/stock-page').then((page) => page.StockPage) },
      { path: 'movimentacoes', loadComponent: () => import('./features/inventory/ui/pages/movements-page').then((page) => page.MovementsPage) },
      { path: 'previsoes', loadComponent: () => import('./features/inventory/ui/pages/forecast-page').then((page) => page.ForecastPage) },
      { path: 'relatorios', loadComponent: () => import('./features/inventory/ui/pages/reports-page').then((page) => page.ReportsPage) },
      { path: 'acessos', loadComponent: () => import('./features/inventory/ui/pages/access-page').then((page) => page.AccessPage) },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];

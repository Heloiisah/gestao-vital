import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { DemoInventoryRepository } from './features/inventory/adapters/outbound/demo/demo-inventory.repository';
import { HttpInventoryRepository } from './features/inventory/adapters/outbound/http/http-inventory.repository';
import { InventoryRepository } from './features/inventory/application/ports/inventory.repository';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/http/auth.interceptor';
import { AuthService } from './core/auth/auth.service';
import { DemoWorkspaceRepository } from './core/workspace/adapters/demo/demo-workspace.repository';
import { HttpWorkspaceRepository } from './core/workspace/adapters/http/http-workspace.repository';
import { WorkspaceRepository } from './core/workspace/application/workspace.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAppInitializer(() => inject(AuthService).initializeSession()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withViewTransitions()),
    { provide: InventoryRepository, useClass: environment.useDemoData ? DemoInventoryRepository : HttpInventoryRepository },
    { provide: WorkspaceRepository, useFactory: () => {
      if (!environment.useDemoData) return inject(HttpWorkspaceRepository);
      const auth = inject(AuthService);
      return new DemoWorkspaceRepository(() => auth.user());
    } },
  ]
};

import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';
import { DemoInventoryRepository } from './features/inventory/adapters/outbound/demo/demo-inventory.repository';
import { HttpInventoryRepository } from './features/inventory/adapters/outbound/http/http-inventory.repository';
import { InventoryRepository } from './features/inventory/application/ports/inventory.repository';
import { environment } from '../environments/environment';
import { authInterceptor } from './core/http/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideRouter(routes, withViewTransitions()),
    { provide: InventoryRepository, useClass: environment.useDemoData ? DemoInventoryRepository : HttpInventoryRepository },
  ]
};

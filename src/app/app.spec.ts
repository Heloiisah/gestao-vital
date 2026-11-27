import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { DemoInventoryRepository } from './features/inventory/adapters/outbound/demo/demo-inventory.repository';
import { InventoryRepository } from './features/inventory/application/ports/inventory.repository';
import { DemoWorkspaceRepository } from './core/workspace/adapters/demo/demo-workspace.repository';
import { WorkspaceRepository } from './core/workspace/application/workspace.repository';
import { AuthService } from './core/auth/auth.service';
import { signal } from '@angular/core';

describe('application routes', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        { provide: InventoryRepository, useClass: DemoInventoryRepository },
        { provide: AuthService, useValue: { user: signal({ id: 'demo-pharmacy', name: 'Maria Silva', role: 'farmacia' }), isDemo: true, initializeSession: async () => {} } },
        { provide: WorkspaceRepository, useFactory: () => new DemoWorkspaceRepository(() => ({ id: 'demo-pharmacy', name: 'Maria Silva', email: 'maria@hospital.test', role: 'farmacia', hospital: 'Hospital Vida Plena', unit: 'Unidade central' })) },
      ],
    }).compileComponents();
  });

  it('opens the dashboard route with the demo-data notice', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/dashboard');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('Dados ilustrativos.');
  }, 20000);

  it('navigates to the medication page with a direct URL', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/medicamentos');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(router.url).toBe('/medicamentos');
    expect(compiled.querySelector('h1')?.textContent).toContain('Medicamentos');
    expect(compiled.textContent).toContain('Amoxicilina 500 mg');
  });
});

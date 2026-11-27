import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { DemoInventoryRepository } from './features/inventory/adapters/outbound/demo/demo-inventory.repository';
import { InventoryRepository } from './features/inventory/application/ports/inventory.repository';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: InventoryRepository, useClass: DemoInventoryRepository }],
    }).compileComponents();
  });

  it('shows the dashboard with a clear demo-data notice', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Dashboard');
    expect(compiled.textContent).toContain('Dados ilustrativos.');
  });

  it('opens the medication catalog from the main navigation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const catalogLink = [...compiled.querySelectorAll<HTMLButtonElement>('.nav-link')]
      .find((button) => button.textContent?.includes('Medicamentos'));

    catalogLink?.click();
    fixture.detectChanges();

    expect(compiled.querySelector('h1')?.textContent).toContain('Medicamentos');
    expect(compiled.textContent).toContain('Amoxicilina 500 mg');
  });
});

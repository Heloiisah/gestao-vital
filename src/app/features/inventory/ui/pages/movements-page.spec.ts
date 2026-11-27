import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { InventoryRepository } from '../../application/ports/inventory.repository';
import { MovementSearch } from '../../domain/inventory.models';
import { MovementsPage } from './movements-page';

describe('MovementsPage', () => {
  const queries: MovementSearch[] = [];
  const repository = {
    medicines: signal([]), lots: signal([]), movements: signal([]), forecasts: signal([]),
    load: async () => {}, refreshForecast: async () => {}, recordMovement: async () => {},
    searchMovements: async (query: MovementSearch) => {
      queries.push(query);
      return { items: [], page: query.page, pageSize: query.pageSize, totalItems: 45, totalPages: 3 };
    },
    exportMovements: async () => [], receiveLot: async () => {}, createMedicine: async () => {},
  };

  beforeEach(async () => {
    queries.length = 0;
    await TestBed.configureTestingModule({
      imports: [MovementsPage],
      providers: [
        provideRouter([]),
        { provide: InventoryRepository, useValue: repository },
        { provide: AuthService, useValue: { user: signal({ id: 'user-1', role: 'farmacia' }), isDemo: true } },
      ],
    }).compileComponents();
  });

  it('loads a server page and sends selected filters to the repository', async () => {
    const fixture = TestBed.createComponent(MovementsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(queries[0]).toMatchObject({ page: 1, pageSize: 20, kind: 'Todos' });

    const kind = fixture.nativeElement.querySelector('select[name="kind"]') as HTMLSelectElement;
    kind.value = 'Saída';
    kind.dispatchEvent(new Event('change'));
    const from = fixture.nativeElement.querySelector('input[name="from"]') as HTMLInputElement;
    from.value = '2026-11-01';
    from.dispatchEvent(new Event('input'));
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(queries.at(-1)).toMatchObject({ page: 1, kind: 'Saída', from: '2026-11-01' });
    expect(fixture.nativeElement.textContent).toContain('45 registros encontrados');
  });

  it('moves to the next server page', async () => {
    const fixture = TestBed.createComponent(MovementsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const next = fixture.nativeElement.querySelector('.pagination-controls button:last-child') as HTMLButtonElement;
    next.click();
    await fixture.whenStable();
    expect(queries.at(-1)?.page).toBe(2);
  });
});

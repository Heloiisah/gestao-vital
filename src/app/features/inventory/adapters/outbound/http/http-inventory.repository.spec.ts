import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpInventoryRepository } from './http-inventory.repository';

describe('HttpInventoryRepository reports', () => {
  let repository: HttpInventoryRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    repository = new HttpInventoryRepository(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends report filters and pagination to the API and maps page metadata', async () => {
    const resultPromise = repository.searchMovements({
      search: 'amoxicilina', kind: 'Saída', from: '2026-11-01', to: '2026-11-30', page: 2, pageSize: 20,
    });
    const request = http.expectOne((candidate) => candidate.url === '/api/v1/movimentacoes');
    expect(request.request.params.get('pagina')).toBe('2');
    expect(request.request.params.get('tamanho')).toBe('20');
    expect(request.request.params.get('busca')).toBe('amoxicilina');
    expect(request.request.params.get('tipo')).toBe('SAIDA');
    expect(request.request.params.get('de')).toBe('2026-11-01');
    expect(request.request.params.get('ate')).toBe('2026-11-30');
    request.flush({
      itens: [{ medicamento: 'Amoxicilina', tipo: 'SAIDA', quantidade: 8, registradoEm: '2026-11-10T12:00:00Z', registradoPor: { nome: 'Ana' }, lote: 'AMX-1', motivo: 'Dispensação' }],
      pagina: 2, tamanho: 20, totalItens: 21, totalPaginas: 2,
    });

    const result = await resultPromise;
    expect(result).toMatchObject({ page: 2, pageSize: 20, totalItems: 21, totalPages: 2 });
    expect(result.items[0]).toMatchObject({ medicine: 'Amoxicilina', kind: 'Saída', lot: 'AMX-1' });
  });

  it('exports records from every server page while limiting concurrent page requests', async () => {
    const resultPromise = repository.exportMovements({ search: '', kind: 'Todos', from: '', to: '' });
    const first = http.expectOne((request) => request.url === '/api/v1/movimentacoes' && request.params.get('pagina') === '1');
    first.flush({ itens: [movement('Lote 1')], pagina: 1, tamanho: 100, totalItens: 201, totalPaginas: 3 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    const second = http.expectOne((request) => request.url === '/api/v1/movimentacoes' && request.params.get('pagina') === '2');
    const third = http.expectOne((request) => request.url === '/api/v1/movimentacoes' && request.params.get('pagina') === '3');
    second.flush({ itens: [movement('Lote 2')], pagina: 2, tamanho: 100, totalItens: 201, totalPaginas: 3 });
    third.flush({ itens: [movement('Lote 3')], pagina: 3, tamanho: 100, totalItens: 201, totalPaginas: 3 });

    const result = await resultPromise;
    expect(result.map((item) => item.lot)).toEqual(['Lote 1', 'Lote 2', 'Lote 3']);
  });

  it('posts a lot receipt as one idempotent API operation', async () => {
    const receiptPromise = repository.receiveLot({
      idempotencyKey: 'receipt-key-1', medicationId: 'med-1', code: 'AMX-7', expiry: '2030-12-31',
      location: 'Farmácia · A-01', quantity: 15, reason: 'Reposição',
    });
    const request = http.expectOne('/api/v1/estoque/lotes/recebimentos');
    expect(request.request.headers.get('Idempotency-Key')).toBe('receipt-key-1');
    expect(request.request.body).toMatchObject({ medicamentoId: 'med-1', codigo: 'AMX-7', quantidade: 15, motivo: 'Reposição' });
    request.flush({});
    await new Promise((resolve) => setTimeout(resolve, 0));

    http.expectOne('/api/v1/medicamentos').flush([]);
    http.expectOne('/api/v1/estoque/lotes').flush([]);
    http.expectOne((candidate) => candidate.url === '/api/v1/movimentacoes').flush({ itens: [], pagina: 1, tamanho: 50, totalItens: 0, totalPaginas: 0 });
    await receiptPromise;
  });
});

function movement(lot: string) {
  return { medicamento: 'Amoxicilina', tipo: 'SAIDA' as const, quantidade: 1, registradoEm: '2026-11-10T12:00:00Z', registradoPor: { nome: 'Ana' }, lote: lot, motivo: 'Dispensação' };
}

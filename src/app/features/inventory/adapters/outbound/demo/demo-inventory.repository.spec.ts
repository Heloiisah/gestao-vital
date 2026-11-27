import { DemoInventoryRepository } from './demo-inventory.repository';

describe('DemoInventoryRepository', () => {
  it('paginates report rows and reports the total number of pages', async () => {
    const repository = new DemoInventoryRepository();
    const first = await repository.searchMovements({ search: '', kind: 'Todos', from: '', to: '', page: 1, pageSize: 2 });
    const last = await repository.searchMovements({ search: '', kind: 'Todos', from: '', to: '', page: 3, pageSize: 2 });

    expect(first.items).toHaveLength(2);
    expect(first.totalItems).toBe(5);
    expect(first.totalPages).toBe(3);
    expect(last.items).toHaveLength(1);
  });

  it('exports every row matching the report filters, not only the current page', async () => {
    const repository = new DemoInventoryRepository();
    const movements = await repository.exportMovements({ search: '', kind: 'Saída', from: '', to: '' });
    expect(movements).toHaveLength(3);
    expect(movements.every((movement) => movement.kind === 'Saída')).toBe(true);
  });

  it('records a new lot and its opening entry as one successful operation', async () => {
    const repository = new DemoInventoryRepository();
    await repository.receiveLot({
      idempotencyKey: 'test-receipt-1', medicationId: 'med-1', code: 'AMX-TEST-01',
      expiry: '2030-12-31', location: 'Farmácia · A-01', quantity: 25, reason: 'Reposição',
    });

    expect(repository.lots().find((lot) => lot.lot === 'AMX-TEST-01')?.quantity).toBe(25);
    expect(repository.medicines().find((medicine) => medicine.id === 'med-1')?.stock).toBe(107);
    expect(repository.movements()[0]).toMatchObject({ kind: 'Entrada', lot: 'AMX-TEST-01', quantity: 25 });
  });

  it('does not change stock when a receipt is invalid', async () => {
    const repository = new DemoInventoryRepository();
    const stockBefore = repository.medicines().find((medicine) => medicine.id === 'med-1')?.stock;
    await expect(repository.receiveLot({
      idempotencyKey: 'test-receipt-invalid', medicationId: 'med-1', code: 'AMX-24018',
      expiry: '2030-12-31', location: 'Farmácia · A-01', quantity: 25, reason: 'Reposição',
    })).rejects.toThrow('já está cadastrado');
    expect(repository.medicines().find((medicine) => medicine.id === 'med-1')?.stock).toBe(stockBefore);
  });
});

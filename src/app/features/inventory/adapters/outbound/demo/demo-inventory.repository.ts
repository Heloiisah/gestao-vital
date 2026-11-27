import { Signal, signal } from '@angular/core';
import { CreateLotInput, CreateMedicineInput, Forecast, Medicine, Movement, RecordMovementInput, StockLot } from '../../../domain/inventory.models';
import { InventoryRepository } from '../../../application/ports/inventory.repository';

export class DemoInventoryRepository extends InventoryRepository {
  private readonly medicineState = signal<Medicine[]>([
    { id: 'med-1', name: 'Amoxicilina 500 mg', ingredient: 'Amoxicilina', presentation: 'Cápsula', stock: 82, minimum: 100, unit: 'un.', status: 'Crítico' },
    { id: 'med-2', name: 'Dipirona 500 mg/mL', ingredient: 'Dipirona sódica', presentation: 'Solução oral', stock: 320, minimum: 120, unit: 'fr.', status: 'Regular' },
    { id: 'med-3', name: 'Omeprazol 20 mg', ingredient: 'Omeprazol', presentation: 'Cápsula', stock: 146, minimum: 80, unit: 'un.', status: 'Regular' },
    { id: 'med-4', name: 'Soro fisiológico 0,9%', ingredient: 'Cloreto de sódio', presentation: 'Bolsa 500 mL', stock: 38, minimum: 60, unit: 'bolsas', status: 'Estoque baixo' },
    { id: 'med-5', name: 'Paracetamol 750 mg', ingredient: 'Paracetamol', presentation: 'Comprimido', stock: 204, minimum: 100, unit: 'un.', status: 'Regular' },
    { id: 'med-6', name: 'Ceftriaxona 1 g', ingredient: 'Ceftriaxona sódica', presentation: 'Pó injetável', stock: 24, minimum: 40, unit: 'fr.', status: 'Estoque baixo' },
  ]);

  private readonly lotState = signal<StockLot[]>([
    { id: 'lot-1', medicationId: 'med-1', medicine: 'Amoxicilina 500 mg', lot: 'AMX-24018', expiry: '2026-12-12', quantity: 82, location: 'Farmácia central · A-03', status: 'Crítico' },
    { id: 'lot-2', medicationId: 'med-3', medicine: 'Omeprazol 20 mg', lot: 'OMP-24107', expiry: '2026-12-18', quantity: 64, location: 'Farmácia central · B-12', status: 'A vencer' },
    { id: 'lot-3', medicationId: 'med-2', medicine: 'Dipirona 500 mg/mL', lot: 'DIP-25031', expiry: '2027-02-04', quantity: 120, location: 'Farmácia central · C-04', status: 'Regular' },
    { id: 'lot-4', medicationId: 'med-4', medicine: 'Soro fisiológico 0,9%', lot: 'SOR-25009', expiry: '2027-03-21', quantity: 38, location: 'Almoxarifado · D-02', status: 'Regular' },
    { id: 'lot-5', medicationId: 'med-5', medicine: 'Paracetamol 750 mg', lot: 'PAR-25042', expiry: '2027-06-30', quantity: 204, location: 'Farmácia central · A-08', status: 'Regular' },
    { id: 'lot-6', medicationId: 'med-6', medicine: 'Ceftriaxona 1 g', lot: 'CEF-25014', expiry: '2027-01-20', quantity: 24, location: 'Farmácia central · B-03', status: 'Regular' },
  ]);

  private readonly movementState = signal<Movement[]>([
    { medicine: 'Dipirona 500 mg/mL', kind: 'Saída', quantity: 24, date: '2026-11-27T09:42:00-03:00', person: 'Ana Costa', lot: 'DIP-25031', reason: 'Dispensação' },
    { medicine: 'Soro fisiológico 0,9%', kind: 'Entrada', quantity: 60, date: '2026-11-27T08:15:00-03:00', person: 'Carlos Lima', lot: 'SOR-25009', reason: 'Reposição' },
    { medicine: 'Omeprazol 20 mg', kind: 'Saída', quantity: 12, date: '2026-11-26T16:38:00-03:00', person: 'Juliana Alves', lot: 'OMP-24107', reason: 'Dispensação' },
    { medicine: 'Amoxicilina 500 mg', kind: 'Entrada', quantity: 40, date: '2026-11-26T14:06:00-03:00', person: 'Pedro Santos', lot: 'AMX-24018', reason: 'Reposição' },
    { medicine: 'Paracetamol 750 mg', kind: 'Saída', quantity: 18, date: '2026-11-25T11:20:00-03:00', person: 'Mariana Souza', lot: 'PAR-25042', reason: 'Dispensação' },
  ]);
  private readonly forecastState = signal<Forecast[]>([
    { medicationId: 'med-4', medicine: 'Soro fisiológico 0,9%', generatedAt: new Date().toISOString(), horizonDays: 30, predictedConsumption: 3860, unit: 'unidades', confidence: null, enoughData: false, method: null, note: 'Valor ilustrativo. Ainda não há serviço analítico conectado.' },
  ]);

  readonly medicines: Signal<Medicine[]> = this.medicineState.asReadonly();
  readonly lots: Signal<StockLot[]> = this.lotState.asReadonly();
  readonly movements: Signal<Movement[]> = this.movementState.asReadonly();
  readonly forecasts: Signal<Forecast[]> = this.forecastState.asReadonly();

  async load(): Promise<void> {}

  async refreshForecast(days: number): Promise<void> {
    this.forecastState.update((items) => items.map((item) => ({ ...item, horizonDays: days, generatedAt: new Date().toISOString() })));
  }

  async recordMovement(input: RecordMovementInput): Promise<void> {
    const medicine = this.medicineState().find((item) => item.id === input.medicationId);
    const lot = this.lotState().find((item) => item.id === input.lotId && item.medicationId === input.medicationId);
    if (!medicine || !lot) throw new Error('Selecione um lote válido para este medicamento.');
    if (!Number.isInteger(input.quantity) || input.quantity < 1) throw new Error('Informe uma quantidade inteira maior que zero.');
    if (input.kind === 'Saída' && lot.expiry < new Date().toISOString().slice(0, 10)) throw new Error('Não é permitido registrar saída de lote vencido.');
    if (input.kind === 'Saída' && input.quantity > lot.quantity) throw new Error('A quantidade excede o saldo disponível neste lote.');

    const stock = medicine.stock + (input.kind === 'Entrada' ? input.quantity : -input.quantity);
    const status: Medicine['status'] = stock <= medicine.minimum * 0.5 ? 'Crítico' : stock <= medicine.minimum ? 'Estoque baixo' : 'Regular';
    const lotQuantity = lot.quantity + (input.kind === 'Entrada' ? input.quantity : -input.quantity);
    this.medicineState.update((items) => items.map((item) => item.id === medicine.id ? { ...item, stock, status } : item));
    this.lotState.update((items) => items.map((item) => item.id === lot.id ? { ...item, quantity: lotQuantity } : item));
    this.movementState.update((items) => [
      { medicine: medicine.name, kind: input.kind, quantity: input.quantity, date: new Date().toISOString(), person: 'Maria Silva', lot: lot.lot, reason: input.reason },
      ...items,
    ]);
  }

  async createLot(input: CreateLotInput): Promise<string> {
    const medicine = this.medicineState().find((item) => item.id === input.medicationId);
    if (!medicine) throw new Error('Medicamento não encontrado.');
    if (!input.code.trim() || !input.location.trim() || !input.expiry) throw new Error('Informe código, validade e localização do lote.');
    if (input.expiry < new Date().toISOString().slice(0, 10)) throw new Error('A validade do lote precisa ser futura.');
    if (this.lotState().some((lot) => lot.medicationId === medicine.id && lot.lot.toLocaleLowerCase('pt-BR') === input.code.trim().toLocaleLowerCase('pt-BR'))) {
      throw new Error('Este código de lote já está cadastrado para o medicamento.');
    }
    const id = `lot-${Date.now()}`;
    this.lotState.update((items) => [...items, {
      id, medicationId: medicine.id, medicine: medicine.name, lot: input.code.trim(),
      expiry: input.expiry, quantity: 0, location: input.location.trim(), status: 'Regular',
    }]);
    return id;
  }

  async createMedicine(input: CreateMedicineInput): Promise<void> {
    const name = input.name.trim();
    if (!name) throw new Error('Informe o nome do medicamento.');
    if (this.medicineState().some((item) => item.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) {
      throw new Error('Já existe um medicamento com esse nome.');
    }
    this.medicineState.update((items) => [...items, {
      id: `med-${Date.now()}`, name, ingredient: input.ingredient.trim() || 'Não informado',
      presentation: input.presentation.trim() || 'Não informada', stock: 0,
      minimum: input.minimum, unit: 'un.', status: 'Crítico',
    }]);
  }
}

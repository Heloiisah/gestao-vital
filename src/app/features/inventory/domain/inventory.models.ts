export type MovementKind = 'Entrada' | 'Saída';

export interface Medicine {
  id: string;
  name: string;
  ingredient: string;
  presentation: string;
  stock: number;
  minimum: number;
  unit: string;
  status: 'Regular' | 'Estoque baixo' | 'Crítico';
}

export interface StockLot {
  id: string;
  medicationId: string;
  medicine: string;
  lot: string;
  expiry: string;
  quantity: number;
  location: string;
  status: 'Regular' | 'A vencer' | 'Crítico';
}

export interface Movement {
  medicine: string;
  kind: MovementKind;
  quantity: number;
  date: string;
  person: string;
  lot: string;
  reason: string;
}

export interface RecordMovementInput {
  medicationId: string;
  lotId: string;
  kind: MovementKind;
  quantity: number;
  reason: string;
}

export interface CreateMedicineInput {
  name: string;
  ingredient: string;
  presentation: string;
  minimum: number;
}

export interface CreateLotInput {
  medicationId: string;
  code: string;
  expiry: string;
  location: string;
}

export interface Forecast {
  medicationId: string;
  medicine: string;
  generatedAt: string;
  horizonDays: number;
  predictedConsumption: number | null;
  unit: string;
  confidence: number | null;
  enoughData: boolean;
  method: string | null;
  note: string | null;
}


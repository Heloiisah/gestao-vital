import { Signal } from '@angular/core';
import { CreateMedicineInput, Forecast, Medicine, Movement, MovementPage, MovementSearch, ReceiveLotInput, RecordMovementInput, StockLot } from '../../domain/inventory.models';

export abstract class InventoryRepository {
  abstract readonly medicines: Signal<Medicine[]>;
  abstract readonly lots: Signal<StockLot[]>;
  abstract readonly movements: Signal<Movement[]>;
  abstract readonly forecasts: Signal<Forecast[]>;
  abstract load(): Promise<void>;
  abstract refreshForecast(days: number): Promise<void>;
  abstract recordMovement(input: RecordMovementInput): Promise<void>;
  abstract searchMovements(query: MovementSearch): Promise<MovementPage>;
  abstract exportMovements(query: Omit<MovementSearch, 'page' | 'pageSize'>): Promise<Movement[]>;
  abstract receiveLot(input: ReceiveLotInput): Promise<void>;
  abstract createMedicine(input: CreateMedicineInput): Promise<void>;
}

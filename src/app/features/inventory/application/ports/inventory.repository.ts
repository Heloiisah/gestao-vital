import { Signal } from '@angular/core';
import { CreateLotInput, CreateMedicineInput, Forecast, Medicine, Movement, RecordMovementInput, StockLot } from '../../domain/inventory.models';

export abstract class InventoryRepository {
  abstract readonly medicines: Signal<Medicine[]>;
  abstract readonly lots: Signal<StockLot[]>;
  abstract readonly movements: Signal<Movement[]>;
  abstract readonly forecasts: Signal<Forecast[]>;
  abstract load(): Promise<void>;
  abstract refreshForecast(days: number): Promise<void>;
  abstract recordMovement(input: RecordMovementInput): Promise<void>;
  abstract createLot(input: CreateLotInput): Promise<string>;
  abstract createMedicine(input: CreateMedicineInput): Promise<void>;
}

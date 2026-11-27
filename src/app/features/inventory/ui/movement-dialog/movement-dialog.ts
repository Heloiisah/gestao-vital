import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideX } from '@lucide/angular';
import { InventoryRepository } from '../../application/ports/inventory.repository';
import { MovementKind } from '../../domain/inventory.models';
import { toLocalDateOnly } from '../../../../shared/utils/date-only';

@Component({
  selector: 'app-movement-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideX],
  templateUrl: './movement-dialog.html',
})
export class MovementDialogComponent implements OnInit {
  private readonly repository = inject(InventoryRepository);

  @Input({ required: true }) kind: MovementKind = 'Saída';
  @Input() demoMode = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<string>();

  protected readonly medicines = this.repository.medicines;
  protected readonly lots = this.repository.lots;
  protected readonly todayDate = toLocalDateOnly();
  protected readonly medicineId = signal('');
  protected readonly lotId = signal('');
  protected readonly quantity = signal<number | null>(null);
  protected readonly reason = signal('Dispensação');
  protected readonly newLotCode = signal('');
  protected readonly newLotExpiry = signal('');
  protected readonly newLotLocation = signal('');
  protected readonly saving = signal(false);
  private previousRequestBody = '';
  private idempotencyKey = '';
  protected readonly selectedLots = computed(() => this.lots().filter((lot) => lot.medicationId === this.medicineId()));
  protected readonly selectedLot = computed(() => this.lots().find((lot) => lot.id === this.lotId()) ?? null);
  protected readonly validQuantity = computed(() => {
    const value = this.quantity();
    if (value === null || !Number.isInteger(value) || value < 1) return false;
    if (this.lotId() === 'new') return this.kind === 'Entrada' && !!this.newLotCode().trim() &&
      !!this.newLotLocation().trim() && !!this.newLotExpiry() && this.newLotExpiry() >= this.todayDate;
    const lot = this.selectedLot();
    return !!lot && (this.kind === 'Entrada' || (value <= lot.quantity && lot.expiry >= this.todayDate));
  });

  ngOnInit(): void {
    const medicine = this.medicines()[0];
    this.medicineId.set(medicine?.id ?? '');
    this.lotId.set(this.lots().find((lot) => lot.medicationId === medicine?.id)?.id ?? '');
    this.reason.set(this.kind === 'Entrada' ? 'Reposição' : 'Dispensação');
  }

  protected changeMedicine(id: string): void {
    this.medicineId.set(id);
    this.lotId.set(this.lots().find((lot) => lot.medicationId === id)?.id ?? '');
  }

  protected async submit(): Promise<void> {
    const medicine = this.medicines().find((item) => item.id === this.medicineId());
    if (!medicine || !this.validQuantity() || this.saving()) return;
    this.saving.set(true);
    try {
      const requestBody = JSON.stringify({
        medicationId: medicine.id, kind: this.kind, lotId: this.lotId(),
        quantity: this.quantity(), reason: this.reason(), code: this.newLotCode(),
        expiry: this.newLotExpiry(), location: this.newLotLocation(),
      });
      if (requestBody !== this.previousRequestBody) {
        this.previousRequestBody = requestBody;
        this.idempotencyKey = crypto.randomUUID();
      }
      if (this.lotId() === 'new') {
        await this.repository.receiveLot({
          idempotencyKey: this.idempotencyKey,
          medicationId: medicine.id,
          code: this.newLotCode(),
          expiry: this.newLotExpiry(),
          location: this.newLotLocation(),
          quantity: Number(this.quantity()),
          reason: this.reason(),
        });
      } else {
        await this.repository.recordMovement({ idempotencyKey: this.idempotencyKey, medicationId: medicine.id, lotId: this.lotId(), kind: this.kind, quantity: Number(this.quantity()), reason: this.reason() });
      }
      this.saved.emit(`${this.kind} registrada${this.demoMode ? ' no modo demonstração' : ''}.`);
      this.closed.emit();
    } catch (error) {
      this.saved.emit(error instanceof Error ? error.message : 'Não foi possível registrar a movimentação.');
    } finally {
      this.saving.set(false);
    }
  }
}

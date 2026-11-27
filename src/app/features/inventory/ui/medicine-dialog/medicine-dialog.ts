import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InventoryRepository } from '../../application/ports/inventory.repository';

@Component({
  selector: 'app-medicine-dialog',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './medicine-dialog.html',
})
export class MedicineDialogComponent {
  private readonly repository = inject(InventoryRepository);
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<string>();

  protected readonly name = signal('');
  protected readonly ingredient = signal('');
  protected readonly presentation = signal('');
  protected readonly minimum = signal<number | null>(10);
  protected readonly saving = signal(false);

  protected async submit(): Promise<void> {
    const name = this.name().trim();
    if (!name || this.saving()) return;
    this.saving.set(true);
    try {
      await this.repository.createMedicine({
        name, ingredient: this.ingredient(), presentation: this.presentation(),
        minimum: Math.max(1, Number(this.minimum()) || 1),
      });
      this.saved.emit('Medicamento cadastrado.');
      this.closed.emit();
    } catch (error) {
      this.saved.emit(error instanceof Error ? error.message : 'Não foi possível cadastrar o medicamento.');
    } finally {
      this.saving.set(false);
    }
  }
}

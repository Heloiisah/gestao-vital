import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, Signal, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CreateMedicineInput, Forecast, Medicine, Movement, MovementPage, MovementSearch, ReceiveLotInput, RecordMovementInput, StockLot } from '../../../domain/inventory.models';
import { InventoryRepository } from '../../../application/ports/inventory.repository';
import { addDaysToDateOnly, toLocalDateOnly } from '../../../../../shared/utils/date-only';

interface ApiMedicine {
  id: string; nome: string; principioAtivo: string; apresentacao: string;
  estoqueAtual: number; estoqueMinimo: number; unidade: string;
}
interface ApiLot {
  id: string; medicamentoId: string; medicamento: string; codigo: string;
  validade: string; quantidade: number; localizacao: string;
}
interface ApiMovement {
  medicamento: string; tipo: 'ENTRADA' | 'SAIDA'; quantidade: number;
  registradoEm: string; registradoPor: { nome: string }; lote: string; motivo: string;
}
interface ApiMovementPage {
  itens: ApiMovement[];
  pagina: number;
  tamanho: number;
  totalItens: number;
  totalPaginas: number;
}
interface ApiForecast {
  medicamentoId: string; medicamento: string; geradoEm: string; horizonteDias: number;
  consumoPrevisto: number | null; unidade: string; confianca: number | null;
  dadosSuficientes: boolean; metodo: string | null; observacao: string | null;
}
function listFrom<T>(value: T[] | { itens: T[] }): T[] {
  return Array.isArray(value) ? value : value.itens;
}

@Injectable()
export class HttpInventoryRepository extends InventoryRepository {
  private readonly baseUrl = environment.apiBaseUrl;
  private readonly medicineState = signal<Medicine[]>([]);
  private readonly lotState = signal<StockLot[]>([]);
  private readonly movementState = signal<Movement[]>([]);
  private readonly forecastState = signal<Forecast[]>([]);

  readonly medicines: Signal<Medicine[]> = this.medicineState.asReadonly();
  readonly lots: Signal<StockLot[]> = this.lotState.asReadonly();
  readonly movements: Signal<Movement[]> = this.movementState.asReadonly();
  readonly forecasts: Signal<Forecast[]> = this.forecastState.asReadonly();

  constructor(private readonly http: HttpClient) { super(); }

  async load(): Promise<void> {
    try {
      const [medicines, lots, movements] = await Promise.all([
        firstValueFrom(this.http.get<ApiMedicine[] | { itens: ApiMedicine[] }>(`${this.baseUrl}/medicamentos`)),
        firstValueFrom(this.http.get<ApiLot[] | { itens: ApiLot[] }>(`${this.baseUrl}/estoque/lotes`)),
        this.searchMovements({ search: '', kind: 'Todos', from: '', to: '', page: 1, pageSize: 50 }),
      ]);
      this.medicineState.set(listFrom(medicines).map((item) => this.toMedicine(item)));
      this.lotState.set(listFrom(lots).map((item) => this.toLot(item)));
      this.movementState.set(movements.items);
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível carregar os dados do estoque.');
    }
  }

  async refreshForecast(days: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<ApiForecast[] | { itens: ApiForecast[] }>(
        `${this.baseUrl}/previsoes/consumo`, { params: { dias: days } },
      ));
      this.forecastState.set(listFrom(response).map((item) => ({
        medicationId: item.medicamentoId,
        medicine: item.medicamento,
        generatedAt: item.geradoEm,
        horizonDays: item.horizonteDias,
        predictedConsumption: item.consumoPrevisto,
        unit: item.unidade,
        confidence: item.confianca,
        enoughData: item.dadosSuficientes,
        method: item.metodo,
        note: item.observacao,
      })));
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível carregar as previsões.');
    }
  }

  async searchMovements(query: MovementSearch): Promise<MovementPage> {
    try {
      let params = new HttpParams()
        .set('pagina', query.page)
        .set('tamanho', query.pageSize);
      if (query.search.trim()) params = params.set('busca', query.search.trim());
      if (query.kind !== 'Todos') params = params.set('tipo', query.kind === 'Entrada' ? 'ENTRADA' : 'SAIDA');
      if (query.from) params = params.set('de', query.from);
      if (query.to) params = params.set('ate', query.to);
      const response = await firstValueFrom(this.http.get<ApiMovementPage>(`${this.baseUrl}/movimentacoes`, { params }));
      return {
        items: response.itens.map((item) => this.toMovement(item)),
        page: response.pagina,
        pageSize: response.tamanho,
        totalItems: response.totalItens,
        totalPages: response.totalPaginas,
      };
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível consultar as movimentações.');
    }
  }

  async exportMovements(query: Omit<MovementSearch, 'page' | 'pageSize'>): Promise<Movement[]> {
    const pageSize = 100;
    const firstPage = await this.searchMovements({ ...query, page: 1, pageSize });
    const items = [...firstPage.items];
    for (let start = 2; start <= firstPage.totalPages; start += 4) {
      const pageNumbers = Array.from({ length: Math.min(4, firstPage.totalPages - start + 1) }, (_, index) => start + index);
      const pages = await Promise.all(pageNumbers.map((page) => this.searchMovements({ ...query, page, pageSize })));
      for (const page of pages) items.push(...page.items);
    }
    return items;
  }

  async recordMovement(input: RecordMovementInput): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/movimentacoes`, {
        medicamentoId: input.medicationId,
        loteId: input.lotId,
        tipo: input.kind === 'Entrada' ? 'ENTRADA' : 'SAIDA',
        quantidade: input.quantity,
        motivo: input.reason,
      }, { headers: { 'Idempotency-Key': input.idempotencyKey } }));
      await this.load();
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível registrar a movimentação.');
    }
  }

  async createMedicine(input: CreateMedicineInput): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/medicamentos`, {
        nome: input.name,
        principioAtivo: input.ingredient,
        apresentacao: input.presentation,
        estoqueMinimo: input.minimum,
      }));
      await this.load();
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível cadastrar o medicamento.');
    }
  }

  async receiveLot(input: ReceiveLotInput): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.baseUrl}/estoque/lotes/recebimentos`, {
        medicamentoId: input.medicationId,
        codigo: input.code,
        validade: input.expiry,
        localizacao: input.location,
        quantidade: input.quantity,
        motivo: input.reason,
      }, { headers: { 'Idempotency-Key': input.idempotencyKey } }));
      await this.load();
    } catch (error) {
      throw this.toUserError(error, 'Não foi possível registrar o recebimento do lote.');
    }
  }

  private toMedicine(item: ApiMedicine): Medicine {
    return {
      id: item.id, name: item.nome, ingredient: item.principioAtivo,
      presentation: item.apresentacao, stock: item.estoqueAtual,
      minimum: item.estoqueMinimo, unit: item.unidade,
      status: item.estoqueAtual <= item.estoqueMinimo * 0.5 ? 'Crítico'
        : item.estoqueAtual <= item.estoqueMinimo ? 'Estoque baixo' : 'Regular',
    };
  }

  private toLot(item: ApiLot): StockLot {
    const today = toLocalDateOnly();
    const nearExpiry = addDaysToDateOnly(today, 30);
    return {
      id: item.id, medicationId: item.medicamentoId, medicine: item.medicamento,
      lot: item.codigo, expiry: item.validade, quantity: item.quantidade,
      location: item.localizacao,
      status: item.quantidade <= 0 || item.validade < today ? 'Crítico'
        : item.validade <= nearExpiry ? 'A vencer' : 'Regular',
    };
  }

  private toMovement(item: ApiMovement): Movement {
    return {
      medicine: item.medicamento, kind: item.tipo === 'ENTRADA' ? 'Entrada' : 'Saída',
      quantity: item.quantidade, date: item.registradoEm,
      person: item.registradoPor.nome, lot: item.lote, reason: item.motivo,
    };
  }

  private toUserError(error: unknown, fallback: string): Error {
    const response = (error as { error?: { erro?: { mensagem?: string }; message?: string } })?.error;
    return new Error(response?.erro?.mensagem ?? response?.message ?? fallback);
  }
}

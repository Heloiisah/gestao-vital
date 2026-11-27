import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { HttpWorkspaceRepository } from './http-workspace.repository';

describe('HttpWorkspaceRepository', () => {
  let repository: HttpWorkspaceRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    repository = new HttpWorkspaceRepository(TestBed.inject(HttpClient));
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads dashboard metrics and consumption series for the requested period', async () => {
    const loading = repository.loadDashboard(90);
    const request = http.expectOne('/api/v1/dashboard/resumo?dias=90');
    request.flush({
      medicamentosCadastrados: 14, unidadesEmEstoque: 580, estoqueAbaixoDoMinimo: 2,
      lotesProximosDaValidade: 3, consumoMensal: [{ mes: 'Set', unidades: 210 }, { mes: 'Out', unidades: 260 }],
    });
    await loading;
    expect(repository.dashboard()).toMatchObject({ medicineCount: 14, totalUnits: 580, lowStockCount: 2, expiringLotCount: 3 });
    expect(repository.dashboard()?.monthlyConsumption).toEqual([{ label: 'Set', units: 210 }, { label: 'Out', units: 260 }]);
  });

  it('maps alert severities from the API', async () => {
    const loading = repository.loadAlerts();
    http.expectOne('/api/v1/alertas?limite=10').flush({ itens: [
      { id: 'a-1', titulo: 'Saldo crítico', descricao: 'Dipirona · 4 unidades', severidade: 'CRITICO', medicamentoId: 'med-1' },
      { id: 'a-2', titulo: 'Validade próxima', descricao: 'Lote 123', severidade: 'ATENCAO', loteCodigo: '123' },
    ] });
    await loading;
    expect(repository.alerts().map((alert) => alert.severity)).toEqual(['critical', 'warning']);
  });

  it('invites a user and reloads the unit user list', async () => {
    const invite = repository.inviteUser({ email: 'novo@hospital.test', role: 'farmacia', unit: 'Unidade central' });
    const create = http.expectOne('/api/v1/usuarios');
    expect(create.request.body).toEqual({ email: 'novo@hospital.test', papel: 'farmacia', unidade: 'Unidade central' });
    create.flush({});
    await new Promise((resolve) => setTimeout(resolve, 0));
    http.expectOne('/api/v1/usuarios?pagina=1&tamanho=100').flush({ itens: [
      { id: 'user-2', nome: 'Novo Usuário', email: 'novo@hospital.test', papel: 'farmacia', unidade: 'Unidade central', status: 'CONVITE_PENDENTE' },
    ] });
    await invite;
    expect(repository.users()[0]).toMatchObject({ email: 'novo@hospital.test', role: 'farmacia', status: 'invited' });
  });
});

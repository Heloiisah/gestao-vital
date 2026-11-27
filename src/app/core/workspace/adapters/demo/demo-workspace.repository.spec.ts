import { AppUser } from '../../../auth/domain/auth.models';
import { DemoWorkspaceRepository } from './demo-workspace.repository';

describe('DemoWorkspaceRepository', () => {
  const manager: AppUser = {
    id: 'manager-1', name: 'Paulo Gestor', email: 'gestao@hospital.test', role: 'gestao',
    hospital: 'Hospital Vida Plena', unit: 'Unidade central',
  };

  it('provides dashboard metrics and illustrative alerts', async () => {
    const repository = new DemoWorkspaceRepository(() => manager);
    await repository.loadDashboard(180);
    await repository.loadAlerts();
    expect(repository.dashboard()?.monthlyConsumption.length).toBeGreaterThan(1);
    expect(repository.alerts().length).toBeGreaterThan(0);
  });

  it('invites users and prevents duplicate email addresses', async () => {
    const repository = new DemoWorkspaceRepository(() => manager);
    await repository.inviteUser({ email: 'new@hospital.test', role: 'farmacia', unit: 'Unidade central' });
    expect(repository.users().at(-1)).toMatchObject({ email: 'new@hospital.test', status: 'invited' });
    await expect(repository.inviteUser({ email: 'NEW@hospital.test', role: 'gestao', unit: 'Unidade central' })).rejects.toThrow('Já existe');
  });

  it('does not let a manager change or deactivate their own account', async () => {
    const repository = new DemoWorkspaceRepository(() => manager);
    await expect(repository.updateUserRole(manager.id, 'farmacia')).rejects.toThrow('próprio perfil');
    await expect(repository.setUserStatus(manager.id, 'disabled')).rejects.toThrow('própria conta');
  });
});

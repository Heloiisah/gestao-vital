import { UserRole } from '../../auth/domain/auth.models';

export interface ConsumptionPoint {
  label: string;
  units: number;
}

export interface DashboardSummary {
  medicineCount: number;
  totalUnits: number;
  lowStockCount: number;
  expiringLotCount: number;
  monthlyConsumption: ConsumptionPoint[];
}

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface DashboardAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  medicationId?: string;
  lotCode?: string;
}

export type ManagedUserStatus = 'active' | 'invited' | 'disabled';

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  unit: string;
  status: ManagedUserStatus;
}

export interface InviteUserInput {
  email: string;
  role: UserRole;
  unit: string;
}

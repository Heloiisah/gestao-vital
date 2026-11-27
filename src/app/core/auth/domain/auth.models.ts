export type UserRole = 'farmacia' | 'gestao';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  hospital: string;
  unit: string;
}

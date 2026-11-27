import { HttpClient } from '@angular/common/http';
import { Injectable, Signal, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser, UserRole } from './domain/auth.models';

interface LoginResponse { accessToken: string; usuario: AppUser; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userState = signal<AppUser | null>(environment.useDemoData ? {
    id: 'demo-pharmacy', name: 'Maria Silva', email: 'maria@hospital.test',
    role: 'farmacia', hospital: 'Hospital Vida Plena', unit: 'Unidade central',
  } : null);
  private readonly accessTokenState = signal<string | null>(null);
  readonly user: Signal<AppUser | null> = this.userState.asReadonly();
  readonly isDemo = environment.useDemoData;
  readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  async login(email: string, password: string): Promise<void> {
    if (!email.trim() || !password) throw new Error('Informe e-mail e senha.');
    if (this.isDemo) {
      const role: UserRole = email.toLocaleLowerCase('pt-BR').includes('gestao') ? 'gestao' : 'farmacia';
      this.userState.set({
        id: `demo-${role}`, name: role === 'gestao' ? 'Paulo Gestor' : 'Maria Silva',
        email, role, hospital: 'Hospital Vida Plena', unit: 'Unidade central',
      });
      return;
    }
    const result = await firstValueFrom(this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, { email, senha: password }));
    this.accessTokenState.set(result.accessToken);
    this.userState.set(result.usuario);
  }

  logout(): void {
    this.accessTokenState.set(null);
    this.userState.set(null);
  }

  useDemoRole(role: UserRole): void {
    if (!this.isDemo) return;
    this.userState.set({
      id: `demo-${role}`, name: role === 'gestao' ? 'Paulo Gestor' : 'Maria Silva',
      email: role === 'gestao' ? 'gestao@hospital.test' : 'maria@hospital.test',
      role, hospital: 'Hospital Vida Plena', unit: 'Unidade central',
    });
  }

  get accessToken(): string | null { return this.accessTokenState(); }
}

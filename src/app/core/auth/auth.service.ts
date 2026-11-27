import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable, Signal, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppUser, UserRole } from './domain/auth.models';
import { SKIP_AUTH_REFRESH } from '../http/auth-http-context';
import { DEMO_AUTH_MODE } from './auth.tokens';

interface LoginResponse { accessToken: string; usuario: AppUser; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly demoAuthMode = inject(DEMO_AUTH_MODE);
  private readonly userState = signal<AppUser | null>(this.demoAuthMode ? {
    id: 'demo-pharmacy', name: 'Maria Silva', email: 'maria@hospital.test',
    role: 'farmacia', hospital: 'Hospital Vida Plena', unit: 'Unidade central',
  } : null);
  private readonly accessTokenState = signal<string | null>(null);
  private sessionInitialization: Promise<void> | null = null;
  private refreshInFlight: Promise<boolean> | null = null;
  readonly user: Signal<AppUser | null> = this.userState.asReadonly();
  readonly isDemo = this.demoAuthMode;
  readonly apiBaseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  initializeSession(): Promise<void> {
    if (this.isDemo) return Promise.resolve();
    if (!this.sessionInitialization) {
      this.sessionInitialization = this.refreshSession().then(() => undefined);
    }
    return this.sessionInitialization;
  }

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
    const result = await firstValueFrom(this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/login`, { email, senha: password }, {
      withCredentials: true,
      context: new HttpContext().set(SKIP_AUTH_REFRESH, true),
    }));
    this.accessTokenState.set(result.accessToken);
    this.userState.set(result.usuario);
    this.sessionInitialization = Promise.resolve();
  }

  async logout(): Promise<void> {
    const shouldRevoke = !this.isDemo && Boolean(this.userState());
    this.clearSession();
    if (!shouldRevoke) return;
    try {
      await firstValueFrom(this.http.post(`${this.apiBaseUrl}/auth/sair`, {}, {
        withCredentials: true,
        context: new HttpContext().set(SKIP_AUTH_REFRESH, true),
      }));
    } catch {
      // The local session is cleared even if the server cannot be reached.
    }
  }

  clearSession(): void {
    this.accessTokenState.set(null);
    this.userState.set(null);
  }

  refreshSession(): Promise<boolean> {
    if (this.isDemo) return Promise.resolve(true);
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = firstValueFrom(this.http.post<LoginResponse>(`${this.apiBaseUrl}/auth/renovar`, {}, {
      withCredentials: true,
      context: new HttpContext().set(SKIP_AUTH_REFRESH, true),
    })).then((result) => {
      this.accessTokenState.set(result.accessToken);
      this.userState.set(result.usuario);
      return true;
    }).catch(() => {
      this.clearSession();
      return false;
    }).finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
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

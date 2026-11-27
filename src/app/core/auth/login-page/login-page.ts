import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { LucideHeartPulse } from '@lucide/angular';

@Component({
  imports: [FormsModule, RouterLink, LucideHeartPulse],
  selector: 'app-login-page',
  styleUrl: './login-page.scss',
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal('');
  protected readonly busy = signal(false);
  protected readonly demoMode = this.auth.isDemo;

  protected fillDemoCredentials(role: 'farmacia' | 'gestao'): void {
    if (!this.demoMode) return;
    this.email.set(role === 'gestao' ? 'gestao@hospital.test' : 'maria@hospital.test');
    this.password.set('demo123');
    this.error.set('');
  }

  protected async submit(): Promise<void> {
    this.error.set('');
    this.busy.set(true);
    try {
      await this.auth.login(this.email(), this.password());
      await this.router.navigateByUrl('/dashboard');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally { this.busy.set(false); }
  }
}

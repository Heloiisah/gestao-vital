import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { LucideCircleHelp } from '@lucide/angular';
import { AuthService } from '../../../../core/auth/auth.service';
import { UserRole } from '../../../../core/auth/domain/auth.models';

@Component({ selector: 'app-access-page', standalone: true, imports: [CommonModule, LucideCircleHelp], templateUrl: './access-page.html' })
export class AccessPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly user = this.auth.user;
  protected readonly demoMode = this.auth.isDemo;

  protected switchRole(role: UserRole): void { this.auth.useDemoRole(role); }
  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}

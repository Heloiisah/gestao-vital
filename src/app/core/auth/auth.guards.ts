import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authenticatedGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.initializeSession().then(() => auth.user() ? true : router.createUrlTree(['/login']));
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user() ? inject(Router).createUrlTree(['/dashboard']) : true;
};

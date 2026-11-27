import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';
import { SKIP_AUTH_REFRESH } from './auth-http-context';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const withToken = (token: string | null) => token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;
  const outgoing = withToken(auth.accessToken);
  if (request.context.get(SKIP_AUTH_REFRESH)) return next(outgoing);

  return next(outgoing).pipe(catchError((error: unknown) => {
    if ((error as { status?: number })?.status !== 401 || !auth.accessToken) return throwError(() => error);
    return from(auth.refreshSession()).pipe(switchMap((refreshed) => {
      if (!refreshed || !auth.accessToken) {
        void router.navigateByUrl('/login');
        return throwError(() => error);
      }
      return next(withToken(auth.accessToken)).pipe(catchError((retryError: unknown) => {
        if ((retryError as { status?: number })?.status === 401) {
          auth.clearSession();
          void router.navigateByUrl('/login');
        }
        return throwError(() => retryError);
      }));
    }));
  }));
};

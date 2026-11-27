import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export const DEMO_AUTH_MODE = new InjectionToken<boolean>('DEMO_AUTH_MODE', {
  providedIn: 'root',
  factory: () => environment.useDemoData,
});

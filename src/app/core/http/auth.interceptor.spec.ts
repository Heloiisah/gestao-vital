import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let token: string | null;
  const auth = {
    get accessToken() { return token; },
    refreshSession: async () => { token = 'access-refreshed'; return true; },
    clearSession: () => { token = null; },
  };

  beforeEach(() => {
    token = 'access-expired';
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('renews once after a 401 and retries with the new bearer token', async () => {
    const requestPromise = firstValueFrom(httpClient.get('/api/v1/medicamentos'));
    const original = http.expectOne('/api/v1/medicamentos');
    expect(original.request.headers.get('Authorization')).toBe('Bearer access-expired');
    original.flush({}, { status: 401, statusText: 'Unauthorized' });

    await new Promise((resolve) => setTimeout(resolve, 0));
    const retry = http.expectOne('/api/v1/medicamentos');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer access-refreshed');
    retry.flush([]);
    await requestPromise;
  });

  it('propagates non-authentication failures without attempting renewal', async () => {
    const requestPromise = firstValueFrom(httpClient.get('/api/v1/medicamentos')).catch((error: HttpErrorResponse) => error);
    http.expectOne('/api/v1/medicamentos').flush({}, { status: 500, statusText: 'Server Error' });
    const error = await requestPromise;
    expect((error as HttpErrorResponse).status).toBe(500);
    expect(token).toBe('access-expired');
  });
});

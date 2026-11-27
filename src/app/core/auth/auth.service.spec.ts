import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { DEMO_AUTH_MODE } from './auth.tokens';

describe('AuthService session lifecycle', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: DEMO_AUTH_MODE, useValue: false }],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('restores the session from the HttpOnly refresh cookie at startup', async () => {
    const initialized = auth.initializeSession();
    const request = http.expectOne('/api/v1/auth/renovar');
    expect(request.request.method).toBe('POST');
    expect(request.request.withCredentials).toBe(true);
    request.flush(sessionResponse('access-restored'));
    await initialized;

    expect(auth.accessToken).toBe('access-restored');
    expect(auth.user()?.email).toBe('maria@hospital.test');
  });

  it('clears local identity when there is no refreshable session', async () => {
    const initialized = auth.initializeSession();
    http.expectOne('/api/v1/auth/renovar').flush({}, { status: 401, statusText: 'Unauthorized' });
    await initialized;
    expect(auth.accessToken).toBeNull();
    expect(auth.user()).toBeNull();
  });
});

function sessionResponse(accessToken: string) {
  return { accessToken, usuario: {
    id: 'user-1', name: 'Maria Silva', email: 'maria@hospital.test', role: 'farmacia' as const,
    hospital: 'Hospital Vida Plena', unit: 'Unidade central',
  } };
}

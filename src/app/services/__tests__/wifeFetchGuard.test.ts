import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    installWifeFetchGuard,
    isWifeProtectedApiUrl,
    resetWifeFetchGuardForTests,
    setWifeNativeFetchForTests,
} from '@/app/security/wifeFetchGuard';

describe('wifeFetchGuard', () => {
  beforeEach(() => {
    resetWifeFetchGuardForTests();
  });

  afterEach(() => {
    resetWifeFetchGuardForTests();
    vi.restoreAllMocks();
  });

  it('detects same-origin protected API routes', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });
    expect(isWifeProtectedApiUrl('/api/forum/posts')).toBe(true);
    expect(isWifeProtectedApiUrl('/api/public/health')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/security/wife-sign')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/security/wife-session')).toBe(true);
    expect(isWifeProtectedApiUrl('/api/security/csrf')).toBe(true);
    expect(isWifeProtectedApiUrl('/api/public/healthz')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/auth/login')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/auth/logout')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/auth/session')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/admin/verify')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/admin/otp/request')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/auth/otp/channels')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/auth/otp/preview')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/admin/otp/csrf')).toBe(false);
    expect(isWifeProtectedApiUrl('/api/admin/otp/dev-unlock')).toBe(false);
    expect(isWifeProtectedApiUrl('https://evil.test/api/forum/posts')).toBe(false);
  });

  it('routes unsigned same-origin /api calls through SecureAPIClient', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });

    const nativeFetch = vi.fn().mockResolvedValue(new Response('native', { status: 200 }));
    setWifeNativeFetchForTests(nativeFetch);

    const secureSpy = vi.fn().mockResolvedValue(new Response('secure', { status: 200 }));
    vi.doMock('./SecureAPIClient', () => ({
      SecureAPIClient: { fetchSecureResponse: secureSpy },
    }));

    const { SecureAPIClient } = await import('../SecureAPIClient');
    const secureMock = vi
      .spyOn(SecureAPIClient, 'fetchSecureResponse')
      .mockResolvedValue(new Response('secure', { status: 200 }));

    installWifeFetchGuard();

    const res = await fetch('/api/forum/posts?limit=5');
    expect(res.status).toBe(200);
    expect(secureMock).toHaveBeenCalledTimes(1);
    expect(nativeFetch).not.toHaveBeenCalled();

    secureMock.mockRestore();
  });

  it('short-circuits local debug event endpoints by default', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });

    const nativeFetch = vi.fn().mockResolvedValue(new Response('native', { status: 200 }));
    setWifeNativeFetchForTests(nativeFetch);

    installWifeFetchGuard();

    const res = await fetch('http://127.0.0.1:7777/event', { method: 'POST' });
    expect(res.status).toBe(204);
    expect(nativeFetch).not.toHaveBeenCalled();
  });

  it('allows local debug event endpoints when explicitly enabled', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });

    const nativeFetch = vi.fn().mockResolvedValue(new Response('native', { status: 200 }));
    setWifeNativeFetchForTests(nativeFetch);
    window.localStorage.setItem('hami:enable-local-debug-events', '1');

    installWifeFetchGuard();

    const res = await fetch('http://127.0.0.1:7777/event', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(nativeFetch).toHaveBeenCalledTimes(1);
  });

  it('passes wife-sign and auth bootstrap through native fetch (no signing loop)', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });

    const nativeFetch = vi.fn().mockResolvedValue(new Response('native', { status: 200 }));
    setWifeNativeFetchForTests(nativeFetch);

    const { SecureAPIClient } = await import('../SecureAPIClient');
    const secureMock = vi
      .spyOn(SecureAPIClient, 'fetchSecureResponse')
      .mockResolvedValue(new Response('secure', { status: 200 }));

    installWifeFetchGuard();

    await fetch('/api/security/wife-sign', { method: 'POST', body: '{}' });
    await fetch('/api/auth/login', { method: 'POST', body: '{}' });

    expect(nativeFetch).toHaveBeenCalledTimes(2);
    expect(secureMock).not.toHaveBeenCalled();
    secureMock.mockRestore();
  });

  it('blocks unsigned XMLHttpRequest to a protected same-origin /api route', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });
    installWifeFetchGuard();

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/task-help');
    expect(() => xhr.send('{}')).toThrow(/unsigned XHR/);
  });

  it('allows XMLHttpRequest to a protected route when a wife signature header is present', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });
    installWifeFetchGuard();

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/task-help');
    xhr.setRequestHeader('x-wife-signature', 'test-signature');
    expect(() => xhr.send('{}')).not.toThrow();
  });

  it('rejects sendBeacon to a protected same-origin /api route', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });
    const nativeBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: nativeBeacon,
    });
    resetWifeFetchGuardForTests();
    installWifeFetchGuard();

    expect(navigator.sendBeacon('/api/task-help', '{}')).toBe(false);
    expect(nativeBeacon).not.toHaveBeenCalled();
  });

  it('allows sendBeacon to a public bootstrap route', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });
    const nativeBeacon = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      writable: true,
      value: nativeBeacon,
    });
    resetWifeFetchGuardForTests();
    installWifeFetchGuard();

    expect(navigator.sendBeacon('/api/public/health', '{}')).toBe(true);
    expect(nativeBeacon).toHaveBeenCalledTimes(1);
  });

  it('rejects EventSource to a protected same-origin /api route', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });
    class FakeEventSource {
      url: string;
      constructor(url: string | URL) {
        this.url = String(url);
      }
    }
    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      writable: true,
      value: FakeEventSource,
    });
    resetWifeFetchGuardForTests();
    installWifeFetchGuard();

    expect(() => new EventSource('/api/forum/posts')).toThrow(/unsigned EventSource/);
  });

  it('allows EventSource to a public bootstrap route', () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });
    class FakeEventSource {
      url: string;
      constructor(url: string | URL) {
        this.url = String(url);
      }
    }
    Object.defineProperty(window, 'EventSource', {
      configurable: true,
      writable: true,
      value: FakeEventSource,
    });
    resetWifeFetchGuardForTests();
    installWifeFetchGuard();

    expect(() => new EventSource('/api/public/healthz')).not.toThrow();
  });
});

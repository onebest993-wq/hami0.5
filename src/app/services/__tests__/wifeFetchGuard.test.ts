import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  installWifeFetchGuard,
  isWifeProtectedApiUrl,
  resetWifeFetchGuardForTests,
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
    expect(isWifeProtectedApiUrl('https://evil.test/api/forum/posts')).toBe(false);
  });

  it('routes unsigned same-origin /api calls through SecureAPIClient', async () => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'http://localhost:5173' },
      configurable: true,
    });

    const nativeFetch = vi.fn().mockResolvedValue(new Response('native', { status: 200 }));
    (globalThis as unknown as Record<symbol, unknown>)[Symbol.for('WIFE_NATIVE_FETCH')] = nativeFetch;

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
});

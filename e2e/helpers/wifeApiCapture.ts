import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { isWifeGuardNativeApiPath } from '@/app/security/wifePublicApi';

export const WIFE_E2E_AUTH_KEY = 'sb-wldjvjnodvyodmgbgzab-auth-token';
export const WIFE_E2E_DEV_MOCK_KEY = 'hami:dev-mock-access-token';
export const WIFE_E2E_ACCESS_TOKEN = 'e2e-wife-smoke-access-token-with-length-ok';
export const WIFE_E2E_USER_ID = 'dev-user-uuid-1';

export type CapturedApiRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
};

export function headerMap(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

export function capturePathname(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return url;
  }
}

/** طلب /api محمي يجب أن يحمل توقيع الحارس — يستثني الإقلاع والعام. */
export function isWifeE2eProtectedCapture(capture: CapturedApiRequest): boolean {
  const pathname = capturePathname(capture.url);
  if (!pathname.startsWith('/api/')) return false;
  return !isWifeGuardNativeApiPath(pathname);
}

/** Validates WIFE signing headers on a protected same-origin /api request. */
export function assertWifeSignedRequest(capture: CapturedApiRequest): void {
  const h = headerMap(capture.headers);
  expect(h['x-wife-signature'], `${capture.method} ${capture.url}`).toBeTruthy();
  expect(h['x-wife-signature']!.length).toBeGreaterThan(16);
  expect(h['x-wife-timestamp'], capture.url).toMatch(/^\d{10,16}$/);
  expect(h['x-wife-nonce'], capture.url).toMatch(/^[A-Za-z0-9\-_]{8,128}$/);
  expect(h['authorization']?.toLowerCase().startsWith('bearer ')).toBe(true);
  expect(h['x-wife-device-id'], capture.url).toMatch(/^[a-f0-9]{16,64}$/);
}

/** طلب موقّع وصل الخادم — 200 مسموح في التطوير للضيف؛ 5xx يعني عطل. */
export function assertWifeSignedHttpOutcome(status: number, label: string): void {
  expect(status, `${label}: signing threw before the request left`).toBeGreaterThan(0);
  expect(status, `${label}: signed request must not 5xx`).toBeGreaterThanOrEqual(200);
  expect(status, `${label}: signed request must not 5xx`).toBeLessThan(500);
}

export async function browserFetchStatus(page: Page, path: string): Promise<number> {
  return page.evaluate(async (url) => {
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      return res.status;
    } catch {
      return 0;
    }
  }, path);
}

export function installApiRequestCapture(page: Page): CapturedApiRequest[] {
  const captures: CapturedApiRequest[] = [];
  page.on('request', (req) => {
    const url = req.url();
    if (!url.includes('/api/')) return;
    if (url.includes('/api/public/')) return;
    captures.push({
      method: req.method(),
      url,
      headers: req.headers(),
    });
  });
  return captures;
}

export function findCapture(
  captures: CapturedApiRequest[],
  predicate: (c: CapturedApiRequest) => boolean,
): CapturedApiRequest | undefined {
  return captures.find(predicate);
}

export async function seedWifeE2eSession(page: Page): Promise<void> {
  await page.addInitScript(
    ({ authKey, mockKey, accessToken, userId }) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem(
        authKey,
        JSON.stringify({
          access_token: accessToken,
          refresh_token: 'e2e-wife-smoke-refresh-token',
          expires_at: expiresAt,
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: userId,
            email: 'wife-e2e@local',
            role: 'authenticated',
            user_metadata: { accountType: 'lawyer', fullName: 'WIFE E2E' },
          },
        }),
      );
      localStorage.setItem(mockKey, accessToken);
      sessionStorage.setItem('hami:last-screen', 'lawyer');
    },
    {
      authKey: WIFE_E2E_AUTH_KEY,
      mockKey: WIFE_E2E_DEV_MOCK_KEY,
      accessToken: WIFE_E2E_ACCESS_TOKEN,
      userId: WIFE_E2E_USER_ID,
    },
  );
}

export async function waitForWifeGuard(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.documentElement.dataset.hamiWifeFetch === '1',
    { timeout: 25_000 },
  );
}

export async function waitForWifeSigningToken(page: Page, timeoutMs = 10_000): Promise<void> {
  await page.waitForFunction(
    ({ mockKey, authKey }) => {
      const mock = (localStorage.getItem(mockKey) ?? '').trim();
      if (mock.length >= 20) return true;
      const blob = localStorage.getItem(authKey);
      return Boolean(blob && blob.includes('access_token'));
    },
    { mockKey: WIFE_E2E_DEV_MOCK_KEY, authKey: WIFE_E2E_AUTH_KEY },
    { timeout: timeoutMs },
  );
}

/** healthz JSON = Vite/BFF حاضر؛ بعده يُسمح لتوقيع المسارات المحمية. */
export async function waitForSameOriginApiReady(page: Page, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/public/healthz', { headers: { Accept: 'application/json' } });
        return (res.headers.get('content-type') ?? '').includes('json');
      } catch {
        return false;
      }
    });
    if (ready) return;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for same-origin /api/public/healthz (${timeoutMs}ms)`);
}

export async function waitForApiCapture(
  captures: CapturedApiRequest[],
  matcher: (c: CapturedApiRequest) => boolean,
  timeoutMs = 20_000,
): Promise<CapturedApiRequest> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = findCapture(captures, matcher);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Timed out waiting for /api capture (${timeoutMs}ms)`);
}

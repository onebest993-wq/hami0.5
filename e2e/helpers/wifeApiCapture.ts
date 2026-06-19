import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export const WIFE_E2E_AUTH_KEY = 'sb-wldjvjnodvyodmgbgzab-auth-token';
export const WIFE_E2E_USER_ID = 'dev-user-uuid-1';

export type CapturedApiRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
};

const WIFE_HEADER_KEYS = ['x-wife-signature', 'x-wife-timestamp', 'x-wife-nonce'] as const;

export function headerMap(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k.toLowerCase()] = v;
  }
  return out;
}

/** Validates WIFE signing headers on a protected same-origin /api request. */
export function assertWifeSignedRequest(capture: CapturedApiRequest): void {
  const h = headerMap(capture.headers);
  expect(h['x-wife-signature'], `${capture.method} ${capture.url}`).toBeTruthy();
  expect(h['x-wife-signature']!.length).toBeGreaterThan(16);
  expect(h['x-wife-timestamp'], capture.url).toMatch(/^\d{10,16}$/);
  expect(h['x-wife-nonce'], capture.url).toMatch(/^[A-Za-z0-9\-_]{8,128}$/);
  expect(h['authorization']?.toLowerCase().startsWith('bearer ')).toBe(true);
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
    ({ authKey, userId }) => {
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem(
        authKey,
        JSON.stringify({
          access_token: 'e2e-wife-smoke-access-token-with-length-ok',
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
      sessionStorage.setItem('hami:last-screen', 'lawyer');
    },
    { authKey: WIFE_E2E_AUTH_KEY, userId: WIFE_E2E_USER_ID },
  );
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

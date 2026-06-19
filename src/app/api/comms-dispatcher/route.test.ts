import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../comms-dispatcher/route.ts';

vi.mock('../security/wifeValidator.ts', () => ({
  extractUserTokenFromRequest: vi.fn(),
  isTokenAuthorized: vi.fn(),
  verifyWifeSignature: vi.fn(),
  getVerifiedTokenSubject: vi.fn(),
  wifeUnauthorizedResponse: vi.fn(() => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })),
  wifeForbiddenResponse: vi.fn(() => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })),
  wifeSignatureFailedResponse: vi.fn(() => new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })),
}));

vi.mock('../security/wifeRateLimitStore.ts', () => ({
  consumeRateLimitSlot: vi.fn(async () => true),
}));

import {
  extractUserTokenFromRequest,
  isTokenAuthorized,
  verifyWifeSignature,
  getVerifiedTokenSubject,
} from '../security/wifeValidator.ts';

describe('comms-dispatcher route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
  });

  it('rejects unauthenticated requests', async () => {
    vi.mocked(extractUserTokenFromRequest).mockReturnValue(null);
    const res = await POST(
      new Request('http://127.0.0.1/api/comms-dispatcher', {
        method: 'POST',
        body: JSON.stringify({ to: '07901234567', message: 'test', channel: 'sms' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('dispatches mock SMS when Twilio is not configured', async () => {
    vi.mocked(extractUserTokenFromRequest).mockReturnValue('token');
    vi.mocked(isTokenAuthorized).mockResolvedValue(true);
    vi.mocked(verifyWifeSignature).mockResolvedValue(true);
    vi.mocked(getVerifiedTokenSubject).mockResolvedValue('user-1');

    const res = await POST(
      new Request('http://127.0.0.1/api/comms-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: '07901234567',
          message: 'نتائج القسام الشرعي',
          channel: 'sms',
        }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; success?: boolean; sid?: string; warning?: string };
    expect(body.ok).toBe(true);
    expect(body.success).toBe(true);
    expect(body.sid).toBeTruthy();
    expect(body.warning).toContain('Mock');
  });

  it('rejects invalid phone numbers', async () => {
    vi.mocked(extractUserTokenFromRequest).mockReturnValue('token');
    vi.mocked(isTokenAuthorized).mockResolvedValue(true);
    vi.mocked(verifyWifeSignature).mockResolvedValue(true);
    vi.mocked(getVerifiedTokenSubject).mockResolvedValue('user-1');

    const res = await POST(
      new Request('http://127.0.0.1/api/comms-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: '123', message: 'hello', channel: 'sms' }),
      }),
    );

    expect(res.status).toBe(400);
  });
});

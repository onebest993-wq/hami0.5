import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../comms-dispatcher/route.ts';

const { requireWifeUserMock } = vi.hoisted(() => ({
  requireWifeUserMock: vi.fn(),
}));

vi.mock('../security/bffAuth.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../security/bffAuth.ts')>();
  return {
    ...actual,
    requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
  };
});

vi.mock('../security/wifeRateLimitStore.ts', () => ({
  consumeRateLimitSlot: vi.fn(async () => true),
}));

describe('comms-dispatcher route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_PHONE_NUMBER;
    requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'user-1' });
  });

  it('rejects unauthenticated requests', async () => {
    requireWifeUserMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    });
    const res = await POST(
      new Request('http://127.0.0.1/api/comms-dispatcher', {
        method: 'POST',
        body: JSON.stringify({ to: '07901234567', message: 'test', channel: 'sms' }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it('dispatches mock SMS when Twilio is not configured', async () => {
    const res = await POST(
      new Request('http://127.0.0.1/api/comms-dispatcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: '07901234567', message: 'hello', channel: 'sms' }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok?: boolean; warning?: string; sid?: string };
    expect(body.ok).toBe(true);
    expect(body.warning).toMatch(/Mock Mode/i);
    expect(body.sid).toMatch(/^SM/);
  });
});

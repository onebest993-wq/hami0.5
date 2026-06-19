import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectStolenTokenServer,
  isValidWifeDeviceId,
  registerTokenSessionServer,
} from './stolenTokenServer.ts';

describe('stolenTokenServer', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    delete process.env.WIFE_REDIS_REST_URL;
    delete process.env.WIFE_REDIS_REST_TOKEN;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers first seen token in memory store (non-production)', async () => {
    const token = buildFakeJwt({
      sub: 'user-a',
      jti: 'jti-1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const first = await detectStolenTokenServer(token, 'device-aaaaaaaa');
    expect(first.status).toBe('valid');

    const registered = await registerTokenSessionServer(token, 'device-aaaaaaaa');
    expect(registered).toBe(true);
  });

  it('flags cloned token when same jti arrives from different device', async () => {
    const token = buildFakeJwt({
      sub: 'user-b',
      jti: 'jti-clone',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await registerTokenSessionServer(token, 'device-bbbbbbbb');
    const verdict = await detectStolenTokenServer(token, 'device-cccccccc');
    expect(verdict.status).toBe('cloned');
  });

  it('flags stolen token when older jti is reused after refresh', async () => {
    const older = buildFakeJwt({
      sub: 'user-c',
      jti: 'jti-old',
      iat: Math.floor(Date.now() / 1000) - 120,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const newer = buildFakeJwt({
      sub: 'user-c',
      jti: 'jti-new',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    await registerTokenSessionServer(newer, 'device-dddddddd');
    const verdict = await detectStolenTokenServer(older, 'device-dddddddd');
    expect(verdict.status).toBe('stolen');
  });

  it('validates device id format for production binding', () => {
    expect(isValidWifeDeviceId('device-aaaaaaaa')).toBe(true);
    expect(isValidWifeDeviceId('short')).toBe(false);
    expect(isValidWifeDeviceId('')).toBe(false);
    expect(isValidWifeDeviceId('<script>')).toBe(false);
  });
});

function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = b64Json({ alg: 'none', typ: 'JWT' });
  const body = b64Json(payload);
  return `${header}.${body}.signature`;
}

function b64Json(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

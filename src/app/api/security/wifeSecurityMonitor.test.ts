import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getWifeRejectionCounters,
  recordWifeRejection,
  resetWifeSecurityMonitorForTests,
} from './wifeSecurityMonitor.ts';

describe('wifeSecurityMonitor', () => {
  beforeEach(() => {
    resetWifeSecurityMonitorForTests();
    process.env.NODE_ENV = 'test';
    delete process.env.SENTRY_DSN;
    delete process.env.WIFE_LOG_REJECTIONS;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('increments counters by reason', () => {
    recordWifeRejection({ reason: 'signature_failed', request: new Request('http://127.0.0.1/api/kv-proxy', { method: 'POST' }) });
    recordWifeRejection({ reason: 'signature_failed' });
    recordWifeRejection({ reason: 'stolen_token', detail: 'older jti' });

    const counters = getWifeRejectionCounters();
    expect(counters.find((c) => c.reason === 'signature_failed')?.count).toBe(2);
    expect(counters.find((c) => c.reason === 'stolen_token')?.count).toBe(1);
  });

  it('logs structured JSON in production', () => {
    process.env.NODE_ENV = 'production';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    recordWifeRejection({
      reason: 'rate_limited',
      request: new Request('http://127.0.0.1/api/forum/posts', { method: 'POST' }),
    });
    expect(warn).toHaveBeenCalled();
    const line = String(warn.mock.calls[0]?.[0] ?? '');
    expect(line).toContain('"type":"wife_rejection"');
    expect(line).toContain('"reason":"rate_limited"');
  });
});

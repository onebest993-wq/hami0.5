import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getWifeRejectionCounters, recordWifeRejection, resetWifeSecurityMonitorForTests, } from './wifeSecurityMonitor.ts';
describe('wifeSecurityMonitor', function () {
    beforeEach(function () {
        resetWifeSecurityMonitorForTests();
        process.env.NODE_ENV = 'test';
        delete process.env.SENTRY_DSN;
        delete process.env.WIFE_LOG_REJECTIONS;
    });
    afterEach(function () {
        vi.restoreAllMocks();
    });
    it('increments counters by reason', function () {
        var _a, _b;
        recordWifeRejection({ reason: 'signature_failed', request: new Request('http://127.0.0.1/api/kv-proxy', { method: 'POST' }) });
        recordWifeRejection({ reason: 'signature_failed' });
        recordWifeRejection({ reason: 'stolen_token', detail: 'older jti' });
        var counters = getWifeRejectionCounters();
        expect((_a = counters.find(function (c) { return c.reason === 'signature_failed'; })) === null || _a === void 0 ? void 0 : _a.count).toBe(2);
        expect((_b = counters.find(function (c) { return c.reason === 'stolen_token'; })) === null || _b === void 0 ? void 0 : _b.count).toBe(1);
    });
    it('logs structured JSON in production', function () {
        var _a, _b;
        process.env.NODE_ENV = 'production';
        var warn = vi.spyOn(console, 'warn').mockImplementation(function () { return undefined; });
        recordWifeRejection({
            reason: 'rate_limited',
            request: new Request('http://127.0.0.1/api/forum/posts', { method: 'POST' }),
        });
        expect(warn).toHaveBeenCalled();
        var line = String((_b = (_a = warn.mock.calls[0]) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : '');
        expect(line).toContain('"type":"wife_rejection"');
        expect(line).toContain('"reason":"rate_limited"');
    });
});

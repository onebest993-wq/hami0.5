import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, resolveCspMode } from './contentSecurityPolicy.ts';
describe('contentSecurityPolicy', function () {
    it('production CSP blocks unsafe-eval and inline scripts', function () {
        var _a;
        var csp = buildContentSecurityPolicy('production');
        var scriptSrc = (_a = csp.split(';').find(function (d) { return d.trim().startsWith('script-src'); })) !== null && _a !== void 0 ? _a : '';
        expect(scriptSrc).toContain("'self'");
        expect(scriptSrc).not.toContain('unsafe-eval');
        expect(scriptSrc).not.toContain('unsafe-inline');
        expect(csp).toContain("script-src-attr 'none'");
        expect(csp).toContain("frame-src 'none'");
        expect(csp).toContain('upgrade-insecure-requests');
        expect(csp).toContain("object-src 'none'");
    });
    it('development CSP allows Vite HMR requirements', function () {
        var csp = buildContentSecurityPolicy('development');
        expect(csp).toContain("'unsafe-eval'");
        expect(csp).toContain('ws://localhost:*');
        expect(csp).not.toContain('upgrade-insecure-requests');
    });
    it('resolveCspMode maps development correctly', function () {
        expect(resolveCspMode('development', 'development')).toBe('development');
        expect(resolveCspMode('production', 'production')).toBe('production');
        expect(resolveCspMode('test', 'development')).toBe('development');
    });
});

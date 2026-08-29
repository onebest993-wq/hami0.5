import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy, resolveCspMode } from './contentSecurityPolicy.ts';

describe('contentSecurityPolicy', () => {
  it('production CSP blocks unsafe-eval and inline scripts', () => {
    const csp = buildContentSecurityPolicy('production');
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(csp).toContain("script-src-attr 'none'");
    expect(csp).toContain("frame-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).toContain("object-src 'none'");
  });

  it('development CSP allows Vite HMR requirements', () => {
    const csp = buildContentSecurityPolicy('development');
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain('ws://localhost:*');
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('e2e-preview CSP keeps production script-src without HTTPS upgrade (WebKit preview)', () => {
    const csp = buildContentSecurityPolicy('e2e-preview');
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).not.toContain('unsafe-eval');
    expect(csp).toContain('http://127.0.0.1:*');
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('resolveCspMode maps development correctly', () => {
    expect(resolveCspMode('development', 'development')).toBe('development');
    expect(resolveCspMode('production', 'production')).toBe('production');
    expect(resolveCspMode('test', 'development')).toBe('development');
  });
});

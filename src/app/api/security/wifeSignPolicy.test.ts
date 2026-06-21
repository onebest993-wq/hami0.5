import { describe, expect, it } from 'vitest';
import { isBlockedWifeSignPath, resolveAllowedWifeSignTarget } from './wifeSignPolicy';

describe('wifeSignPolicy', () => {
    const req = new Request('https://app.test/api/security/wife-sign');

    it('allows same-origin /api/kv-proxy', () => {
        expect(resolveAllowedWifeSignTarget(req, '/api/kv-proxy')).toBe('/api/kv-proxy');
        expect(resolveAllowedWifeSignTarget(req, 'https://app.test/api/forum/posts')).toBe('/api/forum/posts');
    });

    it('rejects external origins', () => {
        expect(resolveAllowedWifeSignTarget(req, 'https://evil.test/api/kv-proxy')).toBeNull();
    });

    it('rejects non-api paths', () => {
        expect(resolveAllowedWifeSignTarget(req, '/admin/secret')).toBeNull();
    });

    it('blocks bootstrap oracle paths', () => {
        expect(isBlockedWifeSignPath('/api/security/wife-sign')).toBe(true);
        expect(isBlockedWifeSignPath('/api/auth/login')).toBe(true);
        expect(resolveAllowedWifeSignTarget(req, '/api/security/wife-sign')).toBeNull();
    });
});

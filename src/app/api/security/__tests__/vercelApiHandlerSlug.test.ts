import { describe, expect, it } from 'vitest';
import { resolveVercelApiSlug } from '../resolveVercelApiSlug.ts';

describe('resolveVercelApiSlug', () => {
    it('joins catch-all query segments', () => {
        expect(resolveVercelApiSlug({ query: { slug: ['admin', 'users'] }, url: '/api/handler' })).toBe(
            'admin/users',
        );
    });

    it('reads a rewrite named slug', () => {
        expect(resolveVercelApiSlug({ query: { slug: 'auth/session' }, url: '/api/handler' })).toBe('auth/session');
    });

    it('falls back to the request path when query is the handler itself', () => {
        expect(resolveVercelApiSlug({ query: { slug: 'handler' }, url: '/api/admin/users?x=1' })).toBe(
            'admin/users',
        );
    });
});

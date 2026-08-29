import { describe, expect, it } from 'vitest';
import {
    INCOMING_COOKIE_FALLBACK_HEADER,
    readAccessTokenFromRequest,
    readIncomingCookieHeader,
    readRefreshTokenFromRequest,
} from './sessionCookie.ts';

describe('readIncomingCookieHeader', () => {
    it('prefers the Cookie header over the adapter fallback', () => {
        const request = new Request('https://app.test/api/auth/session', {
            headers: {
                cookie: 'hami_access_token=from-cookie',
                [INCOMING_COOKIE_FALLBACK_HEADER]: 'hami_access_token=from-fallback',
            },
        });
        expect(readIncomingCookieHeader(request)).toBe('hami_access_token=from-cookie');
        expect(readAccessTokenFromRequest(request)).toBe('from-cookie');
    });

    it('reads the adapter fallback when undici dropped Cookie', () => {
        const request = new Request('https://app.test/api/auth/refresh', {
            headers: {
                [INCOMING_COOKIE_FALLBACK_HEADER]:
                    'hami_access_token=access-only; hami_refresh_token=refresh-only',
            },
        });
        expect(readAccessTokenFromRequest(request)).toBe('access-only');
        expect(readRefreshTokenFromRequest(request)).toBe('refresh-only');
    });
});

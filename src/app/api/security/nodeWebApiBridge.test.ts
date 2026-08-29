import { describe, expect, it } from 'vitest';
import {
    applyWebResponseHeadersToNode,
    createWebRequestFromNode,
    nodeHeadersToWebHeaders,
} from './nodeWebApiBridge.ts';
import {
    INCOMING_COOKIE_FALLBACK_HEADER,
    readIncomingCookieHeader,
    readAccessTokenFromRequest,
} from './sessionCookie.ts';
import { applyWifeSecurityHeaders } from './wifeSecurityHeaders.ts';
import { extractUserTokenFromRequest } from './wifeRequestToken.ts';

describe('nodeWebApiBridge cookies', () => {
    it('drops a spoofed fallback header when Node has no Cookie', () => {
        const headers = nodeHeadersToWebHeaders({
            [INCOMING_COOKIE_FALLBACK_HEADER]: 'hami_access_token=forged',
            origin: 'http://127.0.0.1:8080',
        });
        expect(headers.get('cookie')).toBeNull();
        expect(headers.get(INCOMING_COOKIE_FALLBACK_HEADER)).toBeNull();
    });

    it('copies the real Node cookie onto the fallback after stripping spoofed values', () => {
        const headers = nodeHeadersToWebHeaders({
            cookie: 'hami_access_token=live-session',
            [INCOMING_COOKIE_FALLBACK_HEADER]: 'hami_access_token=forged',
        });
        expect(headers.get(INCOMING_COOKIE_FALLBACK_HEADER)).toBe('hami_access_token=live-session');
        const request = createWebRequestFromNode('http://127.0.0.1:8080/api/auth/session', {
            method: 'GET',
            headers: {
                cookie: 'hami_access_token=live-session',
                [INCOMING_COOKIE_FALLBACK_HEADER]: 'hami_access_token=forged',
            },
        });
        expect(readIncomingCookieHeader(request)).toContain('hami_access_token=live-session');
        expect(readAccessTokenFromRequest(request)).toBe('live-session');
        expect(extractUserTokenFromRequest(request)).toBe('live-session');
    });

    it('copies POST bytes onto a fetch Request body', async () => {
        const payload = new TextEncoder().encode('{"ok":true}');
        const request = createWebRequestFromNode(
            'http://127.0.0.1:8080/api/admin/users',
            { method: 'POST', headers: { origin: 'http://127.0.0.1:8080' } },
            payload,
        );
        expect(await request.text()).toBe('{"ok":true}');
    });

    it('pipes both Set-Cookie values as an array instead of overwriting the last one', () => {
        const headers = new Headers();
        headers.append('Set-Cookie', 'hami_access_token=access; Path=/; HttpOnly');
        headers.append('Set-Cookie', 'hami_refresh_token=refresh; Path=/; HttpOnly');
        const webRes = applyWifeSecurityHeaders(new Response('ok', { status: 200, headers }));
        expect(webRes.headers.getSetCookie().some((c) => c.includes('hami_access_token='))).toBe(true);
        expect(webRes.headers.getSetCookie().some((c) => c.includes('hami_refresh_token='))).toBe(true);

        const recorded: Record<string, unknown> = {};
        applyWebResponseHeadersToNode(
            {
                setHeader(name, value) {
                    recorded[name.toLowerCase()] = value;
                },
            },
            webRes,
        );
        expect(recorded['set-cookie']).toEqual([
            expect.stringContaining('hami_access_token='),
            expect.stringContaining('hami_refresh_token='),
        ]);
    });
});

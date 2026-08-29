import { afterEach, describe, expect, it } from 'vitest';
import { assertSameOriginRequest } from './wifeSameOrigin.ts';

function req(url: string, headers: Record<string, string> = {}): Request {
    return new Request(url, { method: 'POST', headers });
}

describe('assertSameOriginRequest', () => {
    const previousNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = previousNodeEnv;
    });

    it('يقبل Origin المتصفح على :8080 مقابل Request بلا منفذ على loopback (خلل محوّل Vite)', () => {
        process.env.NODE_ENV = 'development';
        expect(
            assertSameOriginRequest(
                req('http://127.0.0.1/api/security/wife-sign', {
                    origin: 'http://127.0.0.1:8080',
                }),
            ),
        ).toBe(true);
        expect(
            assertSameOriginRequest(
                req('http://127.0.0.1/api/security/wife-sign', {
                    origin: 'http://localhost:8080',
                }),
            ),
        ).toBe(true);
    });

    it('يرفض أصلاً معادياً', () => {
        process.env.NODE_ENV = 'development';
        expect(
            assertSameOriginRequest(
                req('http://127.0.0.1/api/security/wife-sign', {
                    origin: 'https://evil.test',
                }),
            ),
        ).toBe(false);
    });

    it('في الإنتاج لا يساوي منفذ 80 بمنفذ 8080', () => {
        process.env.NODE_ENV = 'production';
        expect(
            assertSameOriginRequest(
                req('http://127.0.0.1/api/security/wife-sign', {
                    origin: 'http://127.0.0.1:8080',
                }),
            ),
        ).toBe(false);
    });
});

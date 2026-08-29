import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePasswordResetRedirectTo } from './passwordResetRedirectAllowlist.ts';

function req(origin?: string): Request {
    const request = new Request('https://app.hami.legal/api/auth/forgot-password', {
        method: 'POST',
        headers: origin ? { origin } : {},
    });
    if (origin && !request.headers.get('origin')) {
        vi.spyOn(request.headers, 'get').mockImplementation((name: string) =>
            name.toLowerCase() === 'origin' ? origin : null,
        );
    }
    return request;
}

describe('passwordResetRedirectAllowlist', () => {
    beforeEach(() => {
        delete process.env.PASSWORD_RESET_ALLOWED_ORIGINS;
        delete process.env.PUBLIC_APP_URL;
        delete process.env.SITE_URL;
    });

    it('rejects attacker-controlled https origins', () => {
        expect(
            resolvePasswordResetRedirectTo('https://evil.example/steal', req('https://app.hami.legal')),
        ).toBe('');
    });

    it('allows hami.legal https origins', () => {
        expect(
            resolvePasswordResetRedirectTo('https://app.hami.legal/reset', req()),
        ).toBe('https://app.hami.legal/reset');
    });

    it('allows capacitor deep link schemes', () => {
        expect(resolvePasswordResetRedirectTo('iq.hami.legal://auth/reset', req())).toBe(
            'iq.hami.legal://auth/reset',
        );
    });

    it('falls back to request origin when redirect empty', () => {
        expect(resolvePasswordResetRedirectTo('', req('https://app.hami.legal'))).toBe(
            'https://app.hami.legal',
        );
    });

    it('ignores evil origin header', () => {
        expect(resolvePasswordResetRedirectTo('', req('https://evil.example'))).toBe('');
    });
});

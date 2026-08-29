import { describe, expect, it } from 'vitest';
import { attachWifeClientHeaders } from '@/app/services/secureApiWifeSigning';
import { SecureFetchError } from '@/app/services/SecureFetchError';

describe('attachWifeClientHeaders', () => {
    it('still signs when auth is paused if a token exists', async () => {
        const headers = await attachWifeClientHeaders({
            resolvedUrl: 'http://localhost/api/forum/status',
            method: 'GET',
            wireBody: null,
            nextHeaders: {},
            token: 'dev-access-token-guest-lawyer-1',
            bffMode: false,
            authPaused: true,
        });
        const merged = new Headers(headers);
        expect(merged.get('x-wife-signature') ?? merged.get('X-WIFE-Signature')).toBeTruthy();
        expect(merged.get('authorization')).toMatch(/^Bearer /i);
        expect(merged.get('x-wife-device-id')).toMatch(/^[a-f0-9]{16,64}$/);
    });

    it('rejects client HMAC with no token even when not paused', async () => {
        await expect(
            attachWifeClientHeaders({
                resolvedUrl: 'http://localhost/api/forum/status',
                method: 'GET',
                wireBody: null,
                nextHeaders: {},
                token: null,
                bffMode: false,
                authPaused: false,
            }),
        ).rejects.toBeInstanceOf(SecureFetchError);
    });
});

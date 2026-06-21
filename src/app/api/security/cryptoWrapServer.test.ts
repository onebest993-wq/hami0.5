import { describe, expect, it } from 'vitest';
import { deriveClientCryptoWrapCredential } from '@/app/api/security/cryptoWrapServer';

describe('cryptoWrapServer', () => {
    it('derives stable bff-prefixed wrap credential', async () => {
        const a = await deriveClientCryptoWrapCredential('test-access-token');
        const b = await deriveClientCryptoWrapCredential('test-access-token');
        expect(a).toBe(b);
        expect(a.startsWith('bff:')).toBe(true);
    });

    it('returns empty for blank token', async () => {
        expect(await deriveClientCryptoWrapCredential('')).toBe('');
    });
});

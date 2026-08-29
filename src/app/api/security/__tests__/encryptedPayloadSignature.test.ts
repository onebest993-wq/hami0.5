import { describe, expect, it } from 'vitest';
import {
    computeDossierPayloadMac,
    encryptedPayloadSignatureMatches,
    retainCloudRowIfPayloadMacOk,
    sha256HexUtf8,
} from '../encryptedPayloadSignature';

describe('encryptedPayloadSignature', () => {
    it('accepts SHA-256 of the ciphertext', () => {
        const blob = 'iv:ciphertext-payload';
        const sig = sha256HexUtf8(blob);
        expect(encryptedPayloadSignatureMatches(blob, sig)).toBe(true);
        expect(encryptedPayloadSignatureMatches(blob, sig.toUpperCase())).toBe(true);
    });

    it('rejects a mismatched or truncated signature', () => {
        const blob = 'iv:ciphertext-payload';
        expect(encryptedPayloadSignatureMatches(blob, sha256HexUtf8('other'))).toBe(false);
        expect(encryptedPayloadSignatureMatches(blob, 'abc')).toBe(false);
        expect(encryptedPayloadSignatureMatches(blob, '')).toBe(false);
    });

    it('verifies optional server HMAC when the secret is present', () => {
        const prev = process.env.HAMI_DOSSIER_PAYLOAD_MAC_SECRET;
        const prevEnforce = process.env.HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE;
        const prevVercel = process.env.VERCEL_ENV;
        process.env.HAMI_DOSSIER_PAYLOAD_MAC_SECRET = 'unit-test-mac-secret';
        delete process.env.HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE;
        delete process.env.VERCEL_ENV;
        try {
            const blob = 'iv:ciphertext-payload';
            const mac = computeDossierPayloadMac(blob);
            expect(mac).toMatch(/^[0-9a-f]{64}$/);
            expect(retainCloudRowIfPayloadMacOk({ encrypted_data: blob, payload_mac: mac })).toBe(true);
            expect(
                retainCloudRowIfPayloadMacOk({ encrypted_data: blob, payload_mac: sha256HexUtf8('tamper') }),
            ).toBe(false);
            expect(retainCloudRowIfPayloadMacOk({ encrypted_data: blob, payload_mac: null })).toBe(true);
        } finally {
            if (prevEnforce === undefined) delete process.env.HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE;
            else process.env.HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE = prevEnforce;
            if (prevVercel === undefined) delete process.env.VERCEL_ENV;
            else process.env.VERCEL_ENV = prevVercel;
            if (prev === undefined) delete process.env.HAMI_DOSSIER_PAYLOAD_MAC_SECRET;
            else process.env.HAMI_DOSSIER_PAYLOAD_MAC_SECRET = prev;
        }
    });

    it('rejects missing MAC when enforce is on and the secret is present', () => {
        const prevSecret = process.env.HAMI_DOSSIER_PAYLOAD_MAC_SECRET;
        const prevEnforce = process.env.HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE;
        process.env.HAMI_DOSSIER_PAYLOAD_MAC_SECRET = 'unit-test-mac-secret';
        process.env.HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE = 'true';
        try {
            const blob = 'iv:ciphertext-payload';
            expect(retainCloudRowIfPayloadMacOk({ encrypted_data: blob, payload_mac: null })).toBe(false);
            const mac = computeDossierPayloadMac(blob);
            expect(retainCloudRowIfPayloadMacOk({ encrypted_data: blob, payload_mac: mac })).toBe(true);
        } finally {
            if (prevSecret === undefined) delete process.env.HAMI_DOSSIER_PAYLOAD_MAC_SECRET;
            else process.env.HAMI_DOSSIER_PAYLOAD_MAC_SECRET = prevSecret;
            if (prevEnforce === undefined) delete process.env.HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE;
            else process.env.HAMI_DOSSIER_PAYLOAD_MAC_ENFORCE = prevEnforce;
        }
    });
});


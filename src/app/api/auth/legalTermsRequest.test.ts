import { describe, expect, it } from 'vitest';

import { LEGAL_TERMS_ACCEPTANCE_VERSION } from '@/app/services/auth/legalTermsVersion.ts';
import { readTermsVersionFromBody, termsVersionRejectedResponse } from './legalTermsRequest.ts';

describe('legalTermsRequest', () => {
    it('reads a trimmed termsVersion from the JSON body', () => {
        expect(readTermsVersionFromBody({ termsVersion: ` ${LEGAL_TERMS_ACCEPTANCE_VERSION} ` })).toBe(
            LEGAL_TERMS_ACCEPTANCE_VERSION,
        );
        expect(readTermsVersionFromBody({ termsVersion: 1 })).toBe('');
        expect(readTermsVersionFromBody(null)).toBe('');
    });

    it('rejects a missing or forged version', async () => {
        expect(termsVersionRejectedResponse(LEGAL_TERMS_ACCEPTANCE_VERSION)).toBeNull();
        const rejected = termsVersionRejectedResponse('v0-forged');
        expect(rejected).not.toBeNull();
        expect(rejected?.status).toBe(400);
        await expect(rejected?.json()).resolves.toMatchObject({ ok: false, code: 'TERMS_REQUIRED' });
    });
});

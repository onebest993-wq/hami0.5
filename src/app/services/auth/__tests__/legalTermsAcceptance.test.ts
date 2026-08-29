import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    LEGAL_TERMS_ACCEPTANCE_VERSION,
    assertLegalTermsAcceptedOrThrow,
    captureLegalTermsAcceptance,
    clearLegalTermsAcceptance,
    hasAcceptedCurrentLegalTerms,
    isLegalTermsGateRequired,
    markLegalTermsAccepted,
    readLegalTermsAcceptance,
    restoreLegalTermsAcceptance,
} from '@/app/services/auth/legalTermsAcceptance';

describe('legalTermsAcceptance', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
        clearLegalTermsAcceptance();
        window.localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        clearLegalTermsAcceptance();
    });

    it('يفرض البوابة قبل القبول', () => {
        expect(hasAcceptedCurrentLegalTerms()).toBe(false);
        expect(isLegalTermsGateRequired()).toBe(true);
        expect(() => assertLegalTermsAcceptedOrThrow()).toThrow(/الشروط والأحكام/);
    });

    it('يقبل النسخة الحالية ويُبطلها عند اختلاف النسخة', () => {
        markLegalTermsAccepted(new Date('2026-08-12T00:00:00.000Z'));
        expect(hasAcceptedCurrentLegalTerms()).toBe(true);
        expect(isLegalTermsGateRequired()).toBe(false);
        expect(readLegalTermsAcceptance()?.version).toBe(LEGAL_TERMS_ACCEPTANCE_VERSION);
        assertLegalTermsAcceptedOrThrow();

        window.localStorage.setItem(
            'hami:legal:terms-accepted:v1',
            JSON.stringify({ version: 'old-version', acceptedAt: '2020-01-01T00:00:00.000Z' }),
        );
        expect(hasAcceptedCurrentLegalTerms()).toBe(false);
        expect(isLegalTermsGateRequired()).toBe(true);
    });

    it('يتجاوز البوابة عند shell auth open (E2E)', () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        expect(isLegalTermsGateRequired()).toBe(false);
        expect(() => assertLegalTermsAcceptedOrThrow()).not.toThrow();
    });

    it('يعيد موافقة الجهاز بعد مسح التخزين والكوكي كما يحدث عند الخروج', () => {
        markLegalTermsAccepted(new Date('2026-08-12T00:00:00.000Z'));
        const snapshot = captureLegalTermsAcceptance();
        expect(snapshot?.version).toBe(LEGAL_TERMS_ACCEPTANCE_VERSION);
        clearLegalTermsAcceptance();
        window.localStorage.clear();
        expect(hasAcceptedCurrentLegalTerms()).toBe(false);
        restoreLegalTermsAcceptance(snapshot);
        expect(hasAcceptedCurrentLegalTerms()).toBe(true);
        expect(readLegalTermsAcceptance()?.version).toBe(LEGAL_TERMS_ACCEPTANCE_VERSION);
    });
});

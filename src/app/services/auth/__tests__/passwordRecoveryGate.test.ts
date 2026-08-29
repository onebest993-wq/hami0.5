import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
    applyAuthDeepLink,
    clearPasswordRecoveryPending,
    isAuthCallbackReturnUrl,
    isPasswordRecoveryPending,
    isPasswordRecoveryReturnUrl,
    markPasswordRecoveryPending,
    scrubPasswordRecoveryUrlMarkers,
} from '@/app/services/auth/passwordRecoveryGate';

describe('passwordRecoveryGate', () => {
    beforeEach(() => {
        clearPasswordRecoveryPending();
        sessionStorage.clear();
    });

    afterEach(() => {
        clearPasswordRecoveryPending();
        sessionStorage.clear();
    });

    it('detects hami_auth=recovery query', () => {
        expect(isPasswordRecoveryReturnUrl('?hami_auth=recovery', '')).toBe(true);
        expect(isPasswordRecoveryReturnUrl('?foo=1', '')).toBe(false);
    });

    it('detects type=recovery in hash', () => {
        expect(
            isPasswordRecoveryReturnUrl('', '#access_token=x&type=recovery&refresh_token=y'),
        ).toBe(true);
        expect(isPasswordRecoveryReturnUrl('', '#access_token=x&type=signup')).toBe(false);
    });

    it('detects PKCE code as auth callback return', () => {
        expect(isAuthCallbackReturnUrl('?code=abc')).toBe(true);
        expect(isAuthCallbackReturnUrl('?hami_auth=recovery')).toBe(true);
        expect(isAuthCallbackReturnUrl('')).toBe(false);
    });

    it('maps native custom-scheme recovery links', () => {
        expect(applyAuthDeepLink('iq.hami.legal:///?hami_auth=recovery')).toBe(true);
        expect(isPasswordRecoveryPending()).toBe(true);
    });

    it('marks and clears pending flag', () => {
        expect(isPasswordRecoveryPending()).toBe(false);
        markPasswordRecoveryPending();
        expect(isPasswordRecoveryPending()).toBe(true);
        clearPasswordRecoveryPending();
        expect(isPasswordRecoveryPending()).toBe(false);
    });

    it('scrubs recovery markers from the URL', () => {
        window.history.pushState({}, '', '/?hami_auth=recovery#access_token=x&type=recovery');
        scrubPasswordRecoveryUrlMarkers();
        expect(window.location.search.includes('hami_auth=recovery')).toBe(false);
        expect(window.location.hash.includes('type=recovery')).toBe(false);
    });
});

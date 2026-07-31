import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
    HAMI_BOOT_COMPLETE_KEY,
    HAMI_BOOT_SESSION_KEYS,
    HAMI_SPLASH_EXECUTED_KEY,
    isBootRevealDone,
    markBootRevealDone,
} from '@/app/bootstrap/bootReveal';

function clearBootSession() {
    window.__hamiBootRevealDone__ = undefined;
    try {
        for (const key of HAMI_BOOT_SESSION_KEYS) sessionStorage.removeItem(key);
    } catch {
        /* ignore */
    }
}

describe('bootReveal session splash guard', () => {
    beforeEach(clearBootSession);
    afterEach(clearBootSession);

    it('writes both session keys on mark and reads back after global reset', () => {
        expect(isBootRevealDone()).toBe(false);
        markBootRevealDone();
        expect(sessionStorage.getItem(HAMI_BOOT_COMPLETE_KEY)).toBe('1');
        expect(sessionStorage.getItem(HAMI_SPLASH_EXECUTED_KEY)).toBe('1');
        window.__hamiBootRevealDone__ = undefined;
        expect(isBootRevealDone()).toBe(true);
    });

    it('honors hami_boot_complete alone (canonical contract)', () => {
        sessionStorage.setItem(HAMI_BOOT_COMPLETE_KEY, '1');
        window.__hamiBootRevealDone__ = undefined;
        expect(isBootRevealDone()).toBe(true);
    });

    it('honors legacy hami_splash_executed alone', () => {
        sessionStorage.setItem(HAMI_SPLASH_EXECUTED_KEY, '1');
        window.__hamiBootRevealDone__ = undefined;
        expect(isBootRevealDone()).toBe(true);
    });

    it('isSplashGuardFrozen mirrors session boot complete', async () => {
        const { isSplashGuardFrozen } = await import('@/app/bootstrap/bootReveal');
        expect(isSplashGuardFrozen()).toBe(false);
        markBootRevealDone();
        expect(isSplashGuardFrozen()).toBe(true);
    });
});

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
    clearProfileForceVisible,
    concealProfileWarmShell,
    isProfileForceVisible,
    revealProfileWarmShell,
} from '@/app/runtime/profileInstantPaint';

describe('profileInstantPaint', () => {
    beforeEach(() => {
        clearProfileForceVisible();
        document.documentElement.removeAttribute('data-hami-profile-open');
        document.body.innerHTML = '';
    });

    afterEach(() => {
        clearProfileForceVisible();
        document.documentElement.removeAttribute('data-hami-profile-open');
    });

    it('reveals warm profile surface with pointer-events auto', () => {
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        surface.style.visibility = 'hidden';
        document.body.appendChild(surface);

        expect(revealProfileWarmShell()).toBe(true);
        expect(isProfileForceVisible()).toBe(true);
        expect(surface.style.visibility).toBe('visible');
        expect(surface.style.pointerEvents).toBe('auto');
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
    });

    it('conceals the warm profile surface', () => {
        const surface = document.createElement('div');
        surface.setAttribute('data-testid', 'lawyer-dashboard-profile-surface');
        document.body.appendChild(surface);
        revealProfileWarmShell();
        concealProfileWarmShell();

        expect(isProfileForceVisible()).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
    });
});

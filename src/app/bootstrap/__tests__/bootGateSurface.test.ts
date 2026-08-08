import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { finalizeBootGateSurface } from '@/app/bootstrap/bootGateSurface';
import { STATIC_BOOT_SHELL_ID } from '@/app/bootstrap/bootStaticShell';

describe('bootGateSurface', () => {
    beforeEach(() => {
        window.__hamiBootContentReady__ = undefined;
        window.__hamiBootRevealDone__ = undefined;
        vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'setTimeout'] });
    });

    afterEach(() => {
        vi.useRealTimers();
        document.getElementById(STATIC_BOOT_SHELL_ID)?.remove();
        document.documentElement.classList.remove('hami-boot-static-active');
        window.__hamiBootContentReady__ = undefined;
        window.__hamiBootRevealDone__ = undefined;
        window.__hamiHomeMainGridPainted__ = false;
        try {
            sessionStorage.removeItem('hami_boot_complete');
            sessionStorage.removeItem('hami_splash_executed');
        } catch {
            /* ignore */
        }
    });

    it('يزيل #hami-static-boot بعد paint بوابة الدخول', () => {
        document.documentElement.classList.add('hami-boot-static-active');
        const layer = document.createElement('div');
        layer.id = STATIC_BOOT_SHELL_ID;
        document.body.appendChild(layer);

        finalizeBootGateSurface();
        vi.runAllTimers();

        expect(document.getElementById(STATIC_BOOT_SHELL_ID)).toBeNull();
        expect(document.documentElement.dataset.hamiBootRevealed).toBe('1');
    });
});

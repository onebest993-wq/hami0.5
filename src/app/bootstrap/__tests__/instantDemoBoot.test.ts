import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
    applyInstantDemoBootFoundation,
    getBootRevealMaxMs,
    isBootContentReady,
    isBootRevealDone,
} from '@/app/bootstrap/bootReveal';

describe('instant demo boot foundation', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        window.__hamiBootRevealDone__ = undefined;
        window.__hamiBootContentReady__ = undefined;
        document.documentElement.classList.add('hami-boot-static-active');
        document.body.innerHTML =
            '<div id="hami-static-boot" data-testid="hami-static-boot"></div><div id="root"></div>';
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        window.__hamiBootRevealDone__ = undefined;
        window.__hamiBootContentReady__ = undefined;
    });

    it('getBootRevealMaxMs = 0 في بناء تجريبي', () => {
        expect(getBootRevealMaxMs()).toBe(0);
    });

    it('applyInstantDemoBootFoundation يثبت علامة التجريب دون إزالة shell', () => {
        applyInstantDemoBootFoundation();
        expect(isBootRevealDone()).toBe(false);
        expect(isBootContentReady()).toBe(false);
        expect(document.getElementById('hami-static-boot')).not.toBeNull();
        expect(document.documentElement.dataset.hamiDemoInstantBoot).toBe('1');
    });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    bindFramePacingGuard,
    bindHomeScrollPacing,
    isFramePacingGuardActive,
    resetFramePacingGuardForTests,
} from '@/app/runtime/framePacingGuard';

describe('framePacingGuard', () => {
    beforeEach(() => {
        resetFramePacingGuardForTests();
    });

    afterEach(() => {
        resetFramePacingGuardForTests();
        vi.restoreAllMocks();
    });

    it('يُفعّل jank-guard بعد سلسلة إطارات بطيئة', () => {
        const callbacks: FrameRequestCallback[] = [];
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            callbacks.push(cb);
            return callbacks.length;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

        const unbind = bindFramePacingGuard();
        expect(callbacks.length).toBeGreaterThan(0);

        let ts = 0;
        for (let i = 0; i < 8; i += 1) {
            ts += 30;
            const last = callbacks[callbacks.length - 1];
            last?.(ts);
        }

        expect(document.documentElement.dataset.hamiJankGuard).toBe('1');
        expect(isFramePacingGuardActive()).toBe(true);

        unbind();
        expect(document.documentElement.dataset.hamiJankGuard).toBeUndefined();
    });

    it('يضبط data-hami-scrolling أثناء التمرير', () => {
        vi.useFakeTimers();
        const el = document.createElement('div');
        const unbind = bindHomeScrollPacing(el);

        el.dispatchEvent(new Event('scroll'));
        expect(el.dataset.hamiScrolling).toBe('1');

        vi.advanceTimersByTime(150);
        expect(el.dataset.hamiScrolling).toBeUndefined();

        unbind();
        vi.useRealTimers();
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    executeOverlaySnapClose,
    markOverlaySnapClosing,
} from '@/app/runtime/overlaySnapClose';

vi.mock('@/app/utils/bodyScrollLock', () => ({
    reconcileBodyScrollLock: vi.fn(),
}));

import { reconcileBodyScrollLock } from '@/app/utils/bodyScrollLock';

describe('overlaySnapClose', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-overlay-snap-close');
        vi.clearAllMocks();
    });

    it('يعلّم html ثم يزيل العلم في microtask', async () => {
        markOverlaySnapClosing();
        expect(document.documentElement.getAttribute('data-hami-overlay-snap-close')).toBe('1');
        await Promise.resolve();
        expect(document.documentElement.hasAttribute('data-hami-overlay-snap-close')).toBe(false);
    });

    it('ينفّذ conceal ثم commit ويحرّر scroll lock', () => {
        const conceal = vi.fn();
        const commit = vi.fn();
        executeOverlaySnapClose({ conceal, commit });
        expect(conceal).toHaveBeenCalledBefore(commit);
        expect(reconcileBodyScrollLock).toHaveBeenCalledTimes(1);
    });
});

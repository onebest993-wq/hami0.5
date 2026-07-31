import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
    createRafCoalescer,
    shouldVirtualizeArchiveList,
    resolveArchiveVirtualThreshold,
    addPassiveTouchListener,
} from '@/app/runtime/mobileRenderCore';

describe('mobileRenderCore', () => {
    beforeEach(() => {
        document.documentElement.dataset.hamiLite = '0';
    });

    afterEach(() => {
        delete document.documentElement.dataset.hamiLite;
        vi.restoreAllMocks();
    });

    it('يخفض عتبة الافتراضية على وضع lite', () => {
        expect(resolveArchiveVirtualThreshold()).toBe(16);
        expect(shouldVirtualizeArchiveList(16)).toBe(true);
        expect(shouldVirtualizeArchiveList(8)).toBe(false);

        document.documentElement.dataset.hamiLite = '1';
        expect(resolveArchiveVirtualThreshold()).toBe(8);
        expect(shouldVirtualizeArchiveList(8)).toBe(true);
    });

    it('يجمّع استدعاءات rAF', () => {
        const callbacks: FrameRequestCallback[] = [];
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            callbacks.push(cb);
            return callbacks.length;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

        let runs = 0;
        const coalescer = createRafCoalescer(() => {
            runs += 1;
        });
        coalescer.schedule();
        coalescer.schedule();
        coalescer.schedule();
        expect(callbacks).toHaveLength(1);
        callbacks[0]?.(16);
        expect(runs).toBe(1);
        coalescer.cancel();
    });

    it('يسجّل مستمع لمس passive', () => {
        const el = document.createElement('div');
        const spy = vi.fn();
        const off = addPassiveTouchListener(el, 'touchstart', spy);
        el.dispatchEvent(new Event('touchstart'));
        expect(spy).toHaveBeenCalledTimes(1);
        off();
    });
});

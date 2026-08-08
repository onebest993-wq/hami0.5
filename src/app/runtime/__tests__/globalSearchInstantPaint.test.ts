import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    concealGlobalSearchWarmShell,
    revealGlobalSearchWarmShell,
    scheduleGlobalSearchCloseConceal,
} from '@/app/runtime/globalSearchInstantPaint';

describe('globalSearchInstantPaint', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('يكشف طبقة data-search-warm قبل React', () => {
        const layer = document.createElement('div');
        layer.className = 'hami-gs-layer';
        layer.setAttribute('data-search-warm', 'true');
        layer.setAttribute('data-search-open', 'false');
        layer.style.setProperty('visibility', 'hidden', 'important');
        layer.style.setProperty('opacity', '0', 'important');
        document.body.appendChild(layer);

        expect(revealGlobalSearchWarmShell()).toBe(true);
        expect(layer.style.getPropertyValue('visibility')).toBe('');
        expect(layer.style.getPropertyValue('opacity')).toBe('');
        expect(layer.getAttribute('data-search-open')).toBe('true');
    });

    it('يخفي الطبقة مع الإبقاء على العنصر — بلا !important عالق', () => {
        const layer = document.createElement('div');
        layer.className = 'hami-gs-layer';
        layer.setAttribute('data-search-warm', 'true');
        layer.setAttribute('data-search-open', 'true');
        document.body.appendChild(layer);

        concealGlobalSearchWarmShell();
        expect(layer.style.getPropertyPriority('visibility')).toBe('');
        expect(layer.getAttribute('data-search-open')).toBe('false');
        expect(document.body.contains(layer)).toBe(true);

        expect(revealGlobalSearchWarmShell()).toBe(true);
        expect(layer.getAttribute('data-search-open')).toBe('true');
    });

    it('يعيد false إن لم توجد طبقة دافئة', () => {
        expect(revealGlobalSearchWarmShell()).toBe(false);
    });

    it('scheduleGlobalSearchCloseConceal يؤجّل التنفيذ إطارين', async () => {
        const spy = vi.fn();
        const raf = vi
            .spyOn(window, 'requestAnimationFrame')
            .mockImplementation((cb: FrameRequestCallback) => {
                queueMicrotask(() => cb(performance.now()));
                return 1;
            });

        scheduleGlobalSearchCloseConceal(spy);
        expect(spy).not.toHaveBeenCalled();
        await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));
        expect(spy).toHaveBeenCalledTimes(1);
        raf.mockRestore();
    });
});

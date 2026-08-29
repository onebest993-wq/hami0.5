import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginGlobalSearchShellExit,
    clearGlobalSearchShellClosing,
    GLOBAL_SEARCH_LAYER_EXIT_MS,
    GLOBAL_SEARCH_LAYER_EXIT_PAD_MS,
} from '@/app/hooks/lawyerDashboard/globalSearch/globalSearchShellExit';

describe('globalSearchShellExit', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-global-search-open');
        document.documentElement.removeAttribute('data-hami-global-search-closing');
        delete document.documentElement.dataset.hamiReduceMotion;
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearGlobalSearchShellClosing();
        vi.useRealTimers();
    });

    it('مع تقليل الحركة يُغلق فوراً', () => {
        document.documentElement.dataset.hamiReduceMotion = '1';
        const onDone = vi.fn();
        beginGlobalSearchShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
        expect(document.documentElement.hasAttribute('data-hami-global-search-closing')).toBe(false);
    });

    it('بدون طبقة يغلق فوراً', () => {
        const onDone = vi.fn();
        beginGlobalSearchShellExit(onDone);
        expect(onDone).toHaveBeenCalledTimes(1);
    });

    it('يتلاشى ثم ينهي بعد المهلة', () => {
        document.documentElement.setAttribute('data-hami-global-search-open', '1');
        const layer = document.createElement('div');
        layer.className = 'hami-gs-layer';
        document.body.appendChild(layer);

        const onDone = vi.fn();
        beginGlobalSearchShellExit(onDone);
        expect(onDone).not.toHaveBeenCalled();
        expect(document.documentElement.getAttribute('data-hami-global-search-closing')).toBe('1');

        vi.advanceTimersByTime(GLOBAL_SEARCH_LAYER_EXIT_MS + GLOBAL_SEARCH_LAYER_EXIT_PAD_MS);
        expect(onDone).toHaveBeenCalledTimes(1);
    });
});

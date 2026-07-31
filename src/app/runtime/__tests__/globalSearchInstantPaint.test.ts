import { beforeEach, describe, expect, it } from 'vitest';
import {
    concealGlobalSearchWarmShell,
    revealGlobalSearchWarmShell,
} from '@/app/runtime/globalSearchInstantPaint';

describe('globalSearchInstantPaint', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('يكشف طبقة data-search-warm قبل React', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-search-warm', 'true');
        layer.setAttribute('data-search-open', 'false');
        layer.style.visibility = 'hidden';
        layer.style.pointerEvents = 'none';
        document.body.appendChild(layer);

        expect(revealGlobalSearchWarmShell()).toBe(true);
        expect(layer.style.visibility).toBe('visible');
        expect(layer.style.pointerEvents).toBe('auto');
        expect(layer.getAttribute('data-search-open')).toBe('true');
    });

    it('يخفي الطبقة مع الإبقاء على العنصر', () => {
        const layer = document.createElement('div');
        layer.setAttribute('data-search-warm', 'true');
        layer.setAttribute('data-search-open', 'true');
        document.body.appendChild(layer);

        concealGlobalSearchWarmShell();
        expect(layer.style.visibility).toBe('hidden');
        expect(layer.style.pointerEvents).toBe('none');
        expect(layer.getAttribute('data-search-open')).toBe('false');
        expect(document.body.contains(layer)).toBe(true);
    });

    it('يعيد false إن لم توجد طبقة دافئة', () => {
        expect(revealGlobalSearchWarmShell()).toBe(false);
    });
});

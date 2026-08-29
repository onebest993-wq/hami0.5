import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginGlobalSearchDismissLock,
    clearGlobalSearchDismissLock,
    concealGlobalSearchWarmShell,
    isGlobalSearchDismissLocked,
    paintGlobalSearchInstantChrome,
    revealGlobalSearchWarmShell,
} from '@/app/runtime/globalSearchInstantPaint';

describe('globalSearchInstantPaint', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-global-search-open');
        document.documentElement.removeAttribute('data-hami-gs-dismiss-locked');
        vi.useFakeTimers();
    });

    afterEach(() => {
        clearGlobalSearchDismissLock();
        concealGlobalSearchWarmShell();
        vi.useRealTimers();
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

    it('يطلي Host الدافئ بلا جسر', () => {
        const layer = document.createElement('div');
        layer.className = 'hami-gs-layer';
        layer.setAttribute('data-search-warm', 'true');
        layer.setAttribute('data-search-open', 'false');
        document.body.appendChild(layer);

        expect(paintGlobalSearchInstantChrome()).toBe(true);
        expect(layer.getAttribute('data-search-open')).toBe('true');
        expect(document.getElementById('hami-gs-instant-bridge')).toBeNull();
        expect(document.documentElement.getAttribute('data-hami-global-search-open')).toBe('1');
    });

    it('يرسم جسراً برأس البحث لا مقبض فارغ', () => {
        expect(paintGlobalSearchInstantChrome()).toBe(true);
        const bridge = document.getElementById('hami-gs-instant-bridge');
        expect(bridge).toBeTruthy();
        expect(bridge?.querySelector('.hami-gs-layer')).toBeTruthy();
        expect(bridge?.querySelector('.hami-gs-sheet')).toBeTruthy();
        expect(bridge?.querySelector('[data-testid="global-search-paint-input"]')).toBeTruthy();
        expect(bridge?.querySelector('.hami-gs-header')).toBeTruthy();
        expect(bridge?.textContent).toContain('البحث الشامل');
    });

    it('يزيل الجسر عندما يظهر Host بحقل البحث', () => {
        vi.useRealTimers();
        const pending = new Map<number, FrameRequestCallback>();
        let nextId = 1;
        const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            const id = nextId++;
            pending.set(id, cb);
            return id;
        });
        const caf = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
            pending.delete(id);
        });
        const flush = () => {
            const batch = [...pending.entries()];
            pending.clear();
            for (const [, cb] of batch) cb(0);
        };

        try {
            paintGlobalSearchInstantChrome();
            expect(document.getElementById('hami-gs-instant-bridge')).toBeTruthy();

            const shell = document.createElement('div');
            shell.setAttribute('data-hami-global-search-shell', '');
            shell.innerHTML =
                '<div class="hami-gs-layer" data-search-warm="true" data-search-open="true"><div class="hami-gs-sheet" data-testid="global-search-overlay"><input data-testid="global-search-input" /></div></div>';
            document.body.appendChild(shell);

            flush();
            flush();
            expect(document.getElementById('hami-gs-instant-bridge')).toBeNull();
        } finally {
            raf.mockRestore();
            caf.mockRestore();
        }
    });

    it('يقفل الإغلاق حتى تكتمل لمسة العدسة', () => {
        beginGlobalSearchDismissLock();
        expect(isGlobalSearchDismissLocked()).toBe(true);
        window.dispatchEvent(new Event('pointerup', { bubbles: true }));
        window.dispatchEvent(new Event('click', { bubbles: true }));
        expect(isGlobalSearchDismissLocked()).toBe(false);
    });
});

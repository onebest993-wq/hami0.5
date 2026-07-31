import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOpaqueFeatureSurface } from '@/app/hooks/useOpaqueFeatureSurface';

describe('useOpaqueFeatureSurface', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-feature-open');
        document.documentElement.style.backgroundColor = '';
        document.body.style.backgroundColor = '';
        document.querySelector('meta[name="theme-color"]')?.remove();
    });

    afterEach(() => {
        document.documentElement.removeAttribute('data-hami-feature-open');
        document.documentElement.style.backgroundColor = '';
        document.body.style.backgroundColor = '';
        document.querySelector('meta[name="theme-color"]')?.remove();
    });

    it('يضبط theme-color والجسم إلى كروم معتم عند التفعيل', () => {
        const { unmount } = renderHook(() => useOpaqueFeatureSurface(true, '#0B1021'));

        expect(document.documentElement.dataset.hamiFeatureOpen).toBe('1');
        expect(document.querySelector('meta[name="theme-color"]')?.getAttribute('content')).toBe(
            '#0B1021',
        );
        expect(document.body.style.backgroundColor.toLowerCase()).toMatch(/11|0b1021|rgb/);

        unmount();
        expect(document.documentElement.dataset.hamiFeatureOpen).toBeUndefined();
    });

    it('لا يفعل شيئاً عندما active=false', () => {
        renderHook(() => useOpaqueFeatureSurface(false));
        expect(document.documentElement.dataset.hamiFeatureOpen).toBeUndefined();
    });

    it('يطلي SafeView اللوحة بنفس كروم الشاشة المعتمة', () => {
        const dash = document.createElement('div');
        dash.setAttribute('data-hami-lawyer-dashboard', '');
        dash.style.backgroundColor = 'rgb(11, 16, 33)';
        document.body.appendChild(dash);

        const { unmount } = renderHook(() => useOpaqueFeatureSurface(true, '#1f1712'));
        expect(dash.style.backgroundColor.toLowerCase()).toMatch(/1f1712|31,\s*23,\s*18|rgb/);

        unmount();
        expect(dash.style.backgroundColor.toLowerCase()).toMatch(/11,\s*16,\s*33|rgb\(11/);
        dash.remove();
    });
});

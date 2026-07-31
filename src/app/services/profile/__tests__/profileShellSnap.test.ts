import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
    snapProfileShellOpen,
    snapProfileShellClose,
    scheduleProfileShellReactSync,
    isProfileShellSnappedOpen,
} from '@/app/services/profile/profileShellSnap';

describe('profileShellSnap', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-profile-open');
        document.body.innerHTML = `
      <div data-testid="lawyer-dashboard-home-surface" class="hami-dashboard-home-stack-cover is-active"></div>
      <div data-testid="lawyer-dashboard-profile-surface" class="hami-dashboard-tab-preserve"></div>
    `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-profile-open');
    });

    it('يضع علم html فوراً ولا يعتمد على class يمسحه React', () => {
        expect(snapProfileShellOpen()).toBe(true);
        expect(isProfileShellSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
    });

    it('يزيل العلم عند الإغلاق', () => {
        snapProfileShellOpen();
        snapProfileShellClose();
        expect(isProfileShellSnappedOpen()).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
    });

    it('يرجع false إن لم يُركَّب سطح الملف بعد', () => {
        document.body.innerHTML = `<div data-testid="lawyer-dashboard-home-surface"></div>`;
        expect(snapProfileShellOpen()).toBe(false);
        expect(isProfileShellSnappedOpen()).toBe(false);
    });

    it('scheduleProfileShellReactSync يعمل بعد إطار رسم واحد', async () => {
        const spy = vi.fn();
        scheduleProfileShellReactSync(spy);
        expect(spy).not.toHaveBeenCalled();
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('يلغي مزامنة الفتح المعلقة عند الإغلاق السريع', async () => {
        const spy = vi.fn();
        scheduleProfileShellReactSync(spy);
        snapProfileShellClose();
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        expect(spy).not.toHaveBeenCalled();
    });

    it('لا تلغي جدولة لاحقة لنفس دورة الفتح السابقة', async () => {
        const open = vi.fn();
        const clear = vi.fn();
        scheduleProfileShellReactSync(open);
        scheduleProfileShellReactSync(clear);
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        expect(open).toHaveBeenCalledTimes(1);
        expect(clear).toHaveBeenCalledTimes(1);
    });
});

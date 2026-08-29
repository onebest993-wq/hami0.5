import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
    snapProfileShellOpen,
    snapProfileShellClose,
    scheduleProfileShellReactSync,
    isProfileShellSnappedOpen,
    isProfileShellClosing,
    clearProfileShellClosing,
    resetProfileShellSnapForTests,
} from '@/app/services/profile/profileShellSnap';
import {
    markProfileOpenedThisPage,
    resetProfileOpenedThisPageForTests,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

describe('profileShellSnap', () => {
    beforeEach(() => {
        resetProfileOpenedThisPageForTests();
        resetProfileShellSnapForTests();
        document.body.innerHTML = `
      <div data-testid="lawyer-dashboard-home-surface" class="hami-dashboard-home-stack-cover is-active"></div>
      <div data-testid="lawyer-dashboard-profile-surface" class="hami-dashboard-tab-preserve"></div>
    `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        resetProfileShellSnapForTests();
    });

    it('يضع علم html فوراً ولا يعتمد على class يمسحه React', () => {
        expect(snapProfileShellOpen()).toBe(true);
        expect(isProfileShellSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
        expect(isProfileShellClosing()).toBe(false);
    });

    it('يزيل علم الفتح ويضع closing حتى لا يعود --active يغطي الرئيسية', () => {
        snapProfileShellOpen();
        snapProfileShellClose();
        expect(isProfileShellSnappedOpen()).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(isProfileShellClosing()).toBe(true);
        clearProfileShellClosing();
        expect(isProfileShellClosing()).toBe(false);
    });

    it('لا يضع closing إن لم يكن snap مفتوحاً', () => {
        snapProfileShellClose();
        expect(isProfileShellClosing()).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
    });

    it('يرجع false إن لم يُركَّب سطح الملف بعد — مع وضع علم html فوراً', () => {
        document.body.innerHTML = `<div data-testid="lawyer-dashboard-home-surface"></div>`;
        expect(snapProfileShellOpen()).toBe(false);
        expect(isProfileShellSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
    });

    it('scheduleProfileShellReactSync يعمل بعد إطارَي رسم (double rAF)', async () => {
        const spy = vi.fn();
        scheduleProfileShellReactSync(spy);
        expect(spy).not.toHaveBeenCalled();
        await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('يلغي مزامنة الفتح المعلقة عند الإغلاق السريع', async () => {
        const spy = vi.fn();
        scheduleProfileShellReactSync(spy);
        snapProfileShellClose();
        await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        expect(spy).not.toHaveBeenCalled();
    });

    it('لا يمسح snap إن كانت نية الفتح قائمة في هذه الصفحة', () => {
        markProfileOpenedThisPage();
        snapProfileShellOpen();
        snapProfileShellClose();
        expect(isProfileShellSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
    });

    it('لا تلغي جدولة لاحقة لنفس دورة الفتح السابقة', async () => {
        const open = vi.fn();
        const clear = vi.fn();
        scheduleProfileShellReactSync(open);
        scheduleProfileShellReactSync(clear);
        await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
        );
        expect(open).toHaveBeenCalledTimes(1);
        expect(clear).toHaveBeenCalledTimes(1);
    });
});

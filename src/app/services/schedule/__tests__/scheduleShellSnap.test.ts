import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
    snapScheduleShellOpen,
    snapScheduleShellClose,
    scheduleShellReactSync,
    isScheduleShellSnappedOpen,
} from '@/app/services/schedule/scheduleShellSnap';

describe('scheduleShellSnap', () => {
    beforeEach(() => {
        document.documentElement.removeAttribute('data-hami-schedule-open');
        document.body.innerHTML = `
      <div data-testid="lawyer-dashboard-home-surface" class="hami-dashboard-home-stack-cover is-active"></div>
      <div data-testid="lawyer-dashboard-schedule-surface" class="hami-dashboard-tab-preserve"></div>
    `;
    });

    afterEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-schedule-open');
    });

    it('يضع علم html فوراً ولا يعتمد على class يمسحه React', () => {
        expect(snapScheduleShellOpen()).toBe(true);
        expect(isScheduleShellSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-schedule-open')).toBe('1');
    });

    it('يزيل العلم عند الإغلاق', () => {
        snapScheduleShellOpen();
        snapScheduleShellClose();
        expect(isScheduleShellSnappedOpen()).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-schedule-open')).toBe(false);
    });

    it('يرجع false إن لم يُركَّب سطح التقويم بعد', () => {
        document.body.innerHTML = `<div data-testid="lawyer-dashboard-home-surface"></div>`;
        expect(snapScheduleShellOpen()).toBe(false);
        expect(isScheduleShellSnappedOpen()).toBe(false);
    });

    it('scheduleShellReactSync يعمل بعد إطار رسم واحد', async () => {
        const spy = vi.fn();
        scheduleShellReactSync(spy);
        expect(spy).not.toHaveBeenCalled();
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        expect(spy).toHaveBeenCalledTimes(1);
    });

    it('يلغي مزامنة الفتح المعلقة عند الإغلاق السريع', async () => {
        const spy = vi.fn();
        scheduleShellReactSync(spy);
        snapScheduleShellClose();
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        expect(spy).not.toHaveBeenCalled();
    });
});

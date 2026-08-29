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
        performance.clearMarks?.('hami:calendar:open-request');
        performance.clearMarks?.('hami:calendar:first-paint');
        performance.clearMarks?.('hami:calendar:interactive');
    });

    afterEach(() => {
        document.body.innerHTML = '';
        document.documentElement.removeAttribute('data-hami-schedule-open');
    });

    it('يضع علم html فوراً ولا يعتمد على class يمسحه React', () => {
        expect(snapScheduleShellOpen()).toBe(true);
        expect(isScheduleShellSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-schedule-open')).toBe('1');
        expect(performance.getEntriesByName('hami:calendar:open-request', 'mark').length).toBeGreaterThan(0);
        expect(performance.getEntriesByName('hami:calendar:interactive', 'mark').length).toBeGreaterThan(0);
    });

    it('يزيل العلم عند الإغلاق', () => {
        snapScheduleShellOpen();
        snapScheduleShellClose();
        expect(isScheduleShellSnappedOpen()).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-schedule-open')).toBe(false);
    });

    it('يضع العلم حتى بلا سطح تقويم مركّب — الستارة لا تنتظر Host', () => {
        document.body.innerHTML = `<div data-testid="lawyer-dashboard-home-surface"></div>`;
        expect(snapScheduleShellOpen()).toBe(false);
        expect(isScheduleShellSnappedOpen()).toBe(true);
        expect(document.documentElement.getAttribute('data-hami-schedule-open')).toBe('1');
    });

    it('يطلق حدث snap ليستمع MainView ويركب InstantChrome', () => {
        const spy = vi.fn();
        window.addEventListener('hami:schedule-shell-snap', spy);
        snapScheduleShellOpen();
        expect(spy).toHaveBeenCalled();
        const detail = (spy.mock.calls[0][0] as CustomEvent).detail;
        expect(detail.open).toBe(true);
        snapScheduleShellClose();
        expect((spy.mock.calls.at(-1)?.[0] as CustomEvent).detail.open).toBe(false);
        window.removeEventListener('hami:schedule-shell-snap', spy);
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    beginLawyerDashboardBootCycle,
    hasLawyerDashboardFirstTabOpenedThisBoot,
    noteLawyerDashboardFirstTabOpenThisBoot,
    resetLawyerDashboardBootCycleForTests,
} from '@/app/bootstrap/lawyerDashboardBootCycle';
import {
    markLawyerDashboardFirstTabOpenOnce,
    onLawyerDashboardFirstTabOpen,
} from '@/app/bootstrap/lawyerDashboardFirstTabMark';
import { FIRST_TAB_OPEN_EVENT } from '@/app/bootstrap/bootEventNames';

describe('lawyerDashboardBootCycle', () => {
    beforeEach(() => {
        resetLawyerDashboardBootCycleForTests();
    });

    afterEach(() => {
        resetLawyerDashboardBootCycleForTests();
    });

    it('لا يرث first-tab من دورة سابقة', () => {
        beginLawyerDashboardBootCycle();
        expect(noteLawyerDashboardFirstTabOpenThisBoot()).toBe(true);
        expect(hasLawyerDashboardFirstTabOpenedThisBoot()).toBe(true);

        beginLawyerDashboardBootCycle();
        expect(hasLawyerDashboardFirstTabOpenedThisBoot()).toBe(false);
        expect(noteLawyerDashboardFirstTabOpenThisBoot()).toBe(true);
        expect(hasLawyerDashboardFirstTabOpenedThisBoot()).toBe(true);
        expect(noteLawyerDashboardFirstTabOpenThisBoot()).toBe(false);
    });

    it('onLawyerDashboardFirstTabOpen ينتظر الحدث إن لم تُفتَح هذه الدورة', () => {
        beginLawyerDashboardBootCycle();
        const cb = vi.fn();
        const stop = onLawyerDashboardFirstTabOpen(cb);
        expect(cb).not.toHaveBeenCalled();
        window.dispatchEvent(new Event(FIRST_TAB_OPEN_EVENT));
        expect(cb).toHaveBeenCalledTimes(1);
        stop();
    });

    it('onLawyerDashboardFirstTabOpen يجدول فوراً إذا first-tab لهذه الدورة', async () => {
        beginLawyerDashboardBootCycle();
        markLawyerDashboardFirstTabOpenOnce();
        const cb = vi.fn();
        onLawyerDashboardFirstTabOpen(cb);
        await vi.waitFor(() => {
            expect(cb).toHaveBeenCalledTimes(1);
        });
    });
});

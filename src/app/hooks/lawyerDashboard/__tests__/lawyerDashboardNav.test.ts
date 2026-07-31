import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/bootstrap/bootReveal', () => ({
    isBootRevealDone: () => true,
}));

import {
    LAWYER_DASHBOARD_TAB_KEY,
    readInitialLawyerTab,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

describe('readInitialLawyerTab', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('يعيد home عند غياب التخزين', () => {
        expect(readInitialLawyerTab()).toBe('home');
    });

    it('يستعيد schedule فقط — الملف لا يُستعاد بعد reload', () => {
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'profile');
        expect(readInitialLawyerTab()).toBe('home');
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBeNull();
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'schedule');
        expect(readInitialLawyerTab()).toBe('schedule');
    });

    it('لا يستعيد notifications — تبويب وهمي يُفرغ الشاشة', () => {
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'notifications');
        expect(readInitialLawyerTab()).toBe('home');
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBeNull();
    });
});

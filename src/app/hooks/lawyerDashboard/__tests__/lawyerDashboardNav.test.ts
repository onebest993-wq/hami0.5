import { beforeEach, describe, expect, it } from 'vitest';
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

    it('يستعيد profile و schedule', () => {
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'profile');
        expect(readInitialLawyerTab()).toBe('profile');
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'schedule');
        expect(readInitialLawyerTab()).toBe('schedule');
    });

    it('لا يستعيد notifications — تبويب وهمي يُفرغ الشاشة', () => {
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'notifications');
        expect(readInitialLawyerTab()).toBe('home');
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBeNull();
    });
});

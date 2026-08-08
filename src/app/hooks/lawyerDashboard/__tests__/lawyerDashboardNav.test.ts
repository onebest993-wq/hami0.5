import { beforeEach, describe, expect, it, vi } from 'vitest';

const isBootRevealDoneMock = vi.fn(() => true);

vi.mock('@/app/bootstrap/bootReveal', () => ({
    isBootRevealDone: () => isBootRevealDoneMock(),
}));

import {
    LAWYER_DASHBOARD_TAB_KEY,
    LAWYER_GLOBAL_SEARCH_OPEN_KEY,
    readInitialGlobalSearchSession,
    readInitialLawyerTab,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

describe('readInitialLawyerTab', () => {
    beforeEach(() => {
        sessionStorage.clear();
        isBootRevealDoneMock.mockReturnValue(true);
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

    it('يمسح profile من الجلسة حتى قبل boot-reveal', () => {
        isBootRevealDoneMock.mockReturnValue(false);
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'profile');
        expect(readInitialLawyerTab()).toBe('home');
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBeNull();
    });

    it('لا يستعيد notifications — تبويب وهمي يُفرغ الشاشة', () => {
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'notifications');
        expect(readInitialLawyerTab()).toBe('home');
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBeNull();
    });
});

describe('readInitialGlobalSearchSession', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('لا يستعيد البحث بعد reload — يمسح المفتاح', () => {
        sessionStorage.setItem(LAWYER_GLOBAL_SEARCH_OPEN_KEY, '1');
        expect(readInitialGlobalSearchSession()).toEqual({ open: false });
        expect(sessionStorage.getItem(LAWYER_GLOBAL_SEARCH_OPEN_KEY)).toBeNull();
    });

    it('يعيد مغلقاً عند غياب التخزين', () => {
        expect(readInitialGlobalSearchSession()).toEqual({ open: false });
    });
});

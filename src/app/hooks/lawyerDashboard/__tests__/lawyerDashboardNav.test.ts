import { beforeEach, describe, expect, it, vi } from 'vitest';

const isBootRevealDoneMock = vi.fn(() => true);

vi.mock('@/app/bootstrap/bootReveal', () => ({
    isBootRevealDone: () => isBootRevealDoneMock(),
}));

import {
    LAWYER_COMMUNITY_OPEN_KEY,
    LAWYER_DASHBOARD_TAB_KEY,
    LAWYER_GLOBAL_SEARCH_OPEN_KEY,
    LAWYER_TRANSACTIONS_OPEN_KEY,
    LAWYER_FIELD_TASKS_OPEN_KEY,
    LAWYER_FIELD_TASKS_SURFACE_KEY,
    LAWYER_REPOSITORY_OPEN_KEY,
    LAWYER_REPOSITORY_TAB_KEY,
    readInitialRepositorySession,
    readInitialGlobalSearchSession,
    readInitialLawyerTab,
    readInitialTransactionsSession,
    readInitialFieldTasksSession,
    readInitialCommunityOpen,
    resetProfileShellOnColdDashboardBoot,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    markProfileOpenedThisPage,
    resetProfileOpenedThisPageForTests,
} from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';

describe('readInitialLawyerTab', () => {
    beforeEach(() => {
        sessionStorage.clear();
        isBootRevealDoneMock.mockReturnValue(true);
    });

    it('يعيد home عند غياب التخزين', () => {
        expect(readInitialLawyerTab()).toBe('home');
    });

    it('لا يستعيد التقويم ولا الملف بعد reload', () => {
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'profile');
        expect(readInitialLawyerTab()).toBe('home');
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBeNull();
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'schedule');
        expect(readInitialLawyerTab()).toBe('home');
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBeNull();
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

describe('readInitialTransactionsSession', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('لا يستعيد المعاملات بعد reload — يمسح المفتاح', () => {
        sessionStorage.setItem(LAWYER_TRANSACTIONS_OPEN_KEY, '1');
        expect(readInitialTransactionsSession()).toEqual({ open: false });
        expect(sessionStorage.getItem(LAWYER_TRANSACTIONS_OPEN_KEY)).toBeNull();
    });
});

describe('readInitialFieldTasksSession', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('لا يستعيد المهام بعد reload — يمسح المفاتيح', () => {
        sessionStorage.setItem(LAWYER_FIELD_TASKS_OPEN_KEY, '1');
        sessionStorage.setItem(LAWYER_FIELD_TASKS_SURFACE_KEY, 'sheet');
        expect(readInitialFieldTasksSession()).toEqual({ open: false, surface: 'sheet' });
        expect(sessionStorage.getItem(LAWYER_FIELD_TASKS_OPEN_KEY)).toBeNull();
        expect(sessionStorage.getItem(LAWYER_FIELD_TASKS_SURFACE_KEY)).toBeNull();
    });
});

describe('readInitialRepositorySession', () => {
    beforeEach(() => {
        sessionStorage.clear();
    });

    it('لا يستعيد المستودع بعد reload — يمسح المفاتيح', () => {
        sessionStorage.setItem(LAWYER_REPOSITORY_OPEN_KEY, '1');
        sessionStorage.setItem(LAWYER_REPOSITORY_TAB_KEY, 'vault');
        expect(readInitialRepositorySession()).toEqual({ open: false, tab: 'vault' });
        expect(sessionStorage.getItem(LAWYER_REPOSITORY_OPEN_KEY)).toBeNull();
        expect(sessionStorage.getItem(LAWYER_REPOSITORY_TAB_KEY)).toBeNull();
    });
});

describe('readInitialCommunityOpen', () => {
    beforeEach(() => {
        sessionStorage.clear();
        if (typeof window !== 'undefined' && window.location.hash) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
    });

    it('لا يستعيد المنتدى بعد reload — يمسح مفاتيح الجلسة', () => {
        sessionStorage.setItem(LAWYER_COMMUNITY_OPEN_KEY, '1');
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'community');
        expect(readInitialCommunityOpen()).toBe(false);
        expect(sessionStorage.getItem(LAWYER_COMMUNITY_OPEN_KEY)).toBeNull();
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBeNull();
    });

    it('يفتح من رابط منشور فقط', () => {
        window.history.replaceState(null, '', `${window.location.pathname}#community/post/p1`);
        expect(readInitialCommunityOpen()).toBe(true);
    });
});

describe('resetProfileShellOnColdDashboardBoot', () => {
    beforeEach(() => {
        resetProfileOpenedThisPageForTests();
        sessionStorage.clear();
        document.documentElement.removeAttribute('data-hami-profile-open');
        document.documentElement.removeAttribute('data-hami-profile-closing');
    });

    it('يمسح snap عند الإقلاع البارد بلا نية فتح', () => {
        document.documentElement.setAttribute('data-hami-profile-open', '1');
        document.documentElement.setAttribute('data-hami-profile-closing', '1');
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'profile');
        resetProfileShellOnColdDashboardBoot();
        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(document.documentElement.hasAttribute('data-hami-profile-closing')).toBe(false);
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBeNull();
    });

    it('لا يمسح snap إن كانت نية الفتح قائمة في هذه الصفحة', () => {
        markProfileOpenedThisPage();
        document.documentElement.setAttribute('data-hami-profile-open', '1');
        sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, 'profile');
        resetProfileShellOnColdDashboardBoot();
        expect(document.documentElement.getAttribute('data-hami-profile-open')).toBe('1');
        expect(sessionStorage.getItem(LAWYER_DASHBOARD_TAB_KEY)).toBe('profile');
    });
});

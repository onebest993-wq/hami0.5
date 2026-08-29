import { describe, expect, it } from 'vitest';
import {
    computeLawyerDashboardHeaderShouldShow,
    isLawyerDashboardHomeStackTab,
    shouldHideLawyerDashboardHeader,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderVisibility';

const base = {
    showSettings: false,
    isNewCaseModalOpen: false,
    isNotepadOpen: false,
    showCommunity: false,
    activeTab: 'home' as const,
    activeFile: null,
    archiveType: null as null,
    showLawsuitsWorkspace: false,
    showTransactions: false,
    showTasksManager: false,
    showDocs: false,
    isCriminalDossierOpen: false,
};

describe('lawyerDashboardHeaderVisibility', () => {
    it('shows header only on home with no overlays', () => {
        expect(computeLawyerDashboardHeaderShouldShow(base)).toBe(true);
        expect(shouldHideLawyerDashboardHeader(base)).toBe(false);
    });

    it('يبقي الهيدر في React أثناء الملف — الإخفاء عبر CSS snap فقط (عقد الإعدادات)', () => {
        const profile = { ...base, activeTab: 'profile' as const };
        expect(isLawyerDashboardHomeStackTab('profile')).toBe(true);
        expect(shouldHideLawyerDashboardHeader(profile)).toBe(false);
        expect(computeLawyerDashboardHeaderShouldShow(profile)).toBe(true);
    });

    it('مسار طلاء المنزل: الرئيسية والملف فقط — الإشعارات طبقة لا تبويب', () => {
        expect(isLawyerDashboardHomeStackTab('home')).toBe(true);
        expect(isLawyerDashboardHomeStackTab('profile')).toBe(true);
        expect(isLawyerDashboardHomeStackTab('notifications')).toBe(false);
        expect(isLawyerDashboardHomeStackTab('schedule')).toBe(false);
    });

    it('يخفي الهيدر على تبويب التقويم', () => {
        const schedule = { ...base, activeTab: 'schedule' as const };
        expect(isLawyerDashboardHomeStackTab('schedule')).toBe(false);
        expect(shouldHideLawyerDashboardHeader(schedule)).toBe(true);
        expect(computeLawyerDashboardHeaderShouldShow(schedule)).toBe(false);
    });

    it('يبقي الهيدر ظاهراً تحت طبقة الإعدادات (يمنع وميض الإغلاق)', () => {
        const open = { ...base, showSettings: true };
        expect(shouldHideLawyerDashboardHeader(open)).toBe(false);
        expect(computeLawyerDashboardHeaderShouldShow(open)).toBe(true);
    });
});

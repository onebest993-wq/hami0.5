import { describe, expect, it } from 'vitest';
import {
    computeLawyerDashboardHeaderShouldShow,
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

    it('hides header on profile tab (prevents settings/search leak)', () => {
        const profile = { ...base, activeTab: 'profile' as const };
        expect(shouldHideLawyerDashboardHeader(profile)).toBe(true);
        expect(computeLawyerDashboardHeaderShouldShow(profile)).toBe(false);
    });

    it('يبقي الهيدر ظاهراً تحت طبقة الإعدادات (يمنع وميض الإغلاق)', () => {
        const open = { ...base, showSettings: true };
        expect(shouldHideLawyerDashboardHeader(open)).toBe(false);
        expect(computeLawyerDashboardHeaderShouldShow(open)).toBe(true);
    });
});

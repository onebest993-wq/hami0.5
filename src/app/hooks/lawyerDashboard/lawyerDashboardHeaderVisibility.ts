import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

export type LawyerDashboardHeaderVisibilityInput = {
    showSettings: boolean;
    isNewCaseModalOpen: boolean;
    isNotepadOpen: boolean;
    showCommunity: boolean;
    activeTab: LawyerDashboardTab;
    activeFile: FileData | null;
    archiveType: LawyerArchiveOverlay;
    showLawsuitsWorkspace: boolean;
    showTransactions: boolean;
    showTasksManager: boolean;
    showDocs: boolean;
    isCriminalDossierOpen: boolean;
};

export function shouldHideLawyerDashboardHeader(input: LawyerDashboardHeaderVisibilityInput): boolean {
    return (
        /* الإعدادات z-200 فوق الهيدر — لا تُخفِه وإلا وميض عند الإغلاق (conceal قبل React) */
        input.isNewCaseModalOpen ||
        input.isNotepadOpen ||
        input.showCommunity ||
        input.activeTab !== 'home' ||
        Boolean(input.activeFile) ||
        Boolean(input.archiveType) ||
        input.showLawsuitsWorkspace ||
        input.showTransactions ||
        input.showTasksManager ||
        input.showDocs
    );
}

export function computeLawyerDashboardHeaderShouldShow(
    input: LawyerDashboardHeaderVisibilityInput,
): boolean {
    return !shouldHideLawyerDashboardHeader(input) && input.activeTab === 'home' && !input.isCriminalDossierOpen;
}

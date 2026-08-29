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

/**
 * الرئيسية والملف على نفس مسار طلاء المنزل — الملف طبقة فوقه لا بديل عنه،
 * فتبقى شبكة الرئيسية مركّبة تحته. إخفاء الهيدر أثناء الملف عبر
 * html[data-hami-profile-open] فقط. المصدر الوحيد لحساب visible للرئيسية.
 */
export function isLawyerDashboardHomeStackTab(tab: LawyerDashboardTab): boolean {
    return tab === 'home' || tab === 'profile';
}

export function shouldHideLawyerDashboardHeader(input: LawyerDashboardHeaderVisibilityInput): boolean {
    return (
        /* الإعدادات z-200 فوق الهيدر — لا تُخفِه وإلا وميض عند الإغلاق (conceal قبل React) */
        input.isNewCaseModalOpen ||
        input.isNotepadOpen ||
        input.showCommunity ||
        /* الملف: لا تُخفِ الهيدر في React — CSS الـ snap يخفيه (عقد الإعدادات) */
        !isLawyerDashboardHomeStackTab(input.activeTab) ||
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
    return (
        !shouldHideLawyerDashboardHeader(input) &&
        isLawyerDashboardHomeStackTab(input.activeTab) &&
        !input.isCriminalDossierOpen
    );
}

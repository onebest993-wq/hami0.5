import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';

/** حالات تستبدل تبويب الرئيسية/الجدول بشاشة كاملة — لا تشمل البحث أو الأوراق السفلية */
export type LawyerDashboardTabStackMaskState = {
    isCriminalDossierOpen: boolean;
    archiveType: LawyerArchiveOverlay;
    showLawsuitsWorkspace: boolean;
    showTransactions: boolean;
    isNotepadOpen: boolean;
    showSettings: boolean;
    showCommunity: boolean;
    activeFile: FileData | null;
    showDocs: boolean;
};

export function shouldMaskLawyerDashboardTabStack(state: LawyerDashboardTabStackMaskState): boolean {
    return (
        state.isCriminalDossierOpen ||
        Boolean(state.archiveType) ||
        state.showLawsuitsWorkspace ||
        state.showTransactions ||
        state.isNotepadOpen ||
        state.showCommunity ||
        Boolean(state.activeFile) ||
        state.showDocs
    );
}

/** يُفكّ تركيب تبويب الرئيسية/الجدول عند استبداله بشاشة كاملة (لا مجرد CSS hidden) */
export function isLawyerDashboardTabMounted(
    tabActive: boolean,
    mask: LawyerDashboardTabStackMaskState,
): boolean {
    return tabActive && !shouldMaskLawyerDashboardTabStack(mask);
}

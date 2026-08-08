import type { useLawyerDashboardTransactions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardTransactions';
import type { useLawyerDashboardProfileTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab';
import type { useLawyerDashboardFieldTasks } from '@/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks';
import type { OpenScheduleTabOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';
import type { OpenRepositoryOptions } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import type { useLawyerDashboardGlobalSearch } from '@/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch';
import type { useLawyerDashboardGlobalSearchNav } from '@/app/hooks/useLawyerDashboardGlobalSearchNav';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import type { LawyerArchiveOverlay } from '@/app/hooks/useLawyerExecutionFiles';
import type { Dispatch, SetStateAction } from 'react';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile as DashboardExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';

export type DeferredTransactions = ReturnType<typeof useLawyerDashboardTransactions>;
export type DeferredProfile = ReturnType<typeof useLawyerDashboardProfileTab>;
export type DeferredFieldTasks = ReturnType<typeof useLawyerDashboardFieldTasks>;
export type DeferredGlobalSearch = ReturnType<typeof useLawyerDashboardGlobalSearch>;
export type DeferredGlobalSearchNav = ReturnType<typeof useLawyerDashboardGlobalSearchNav>;

/** المنتدى/المستودع/التقويم خارج الجزيرة (مثل الإعدادات) — حي في orchestration */
export type DeferredFeatureBag = {
    transactions: DeferredTransactions;
    profile: DeferredProfile;
    fieldTasks: DeferredFieldTasks;
    globalSearch: DeferredGlobalSearch;
    globalSearchNav: DeferredGlobalSearchNav;
};

export type DeferredPendingOp =
    | 'transactions'
    | 'profile'
    | 'fieldTasks'
    | 'tasksManager'
    | 'globalSearch'
    | null;

export type DeferredFeatureSurfacesParams = {
    userId: string | null;
    activeTab: LawyerDashboardTab;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    setArchiveType: Dispatch<SetStateAction<LawyerArchiveOverlay>>;
    setShowLawsuitsWorkspace: (open: boolean) => void;
    files: FileData[];
    executionFiles: DashboardExecutionFile[];
    openNotifications: () => void;
    /** مغلفات orchestration (إغلاق طبقات متنافسة) — للبحث الشامل */
    openCommunityTab: () => void;
    setShowCommunity: Dispatch<SetStateAction<boolean>>;
    closeCommunity: () => void;
    setCommunityDeepLink: Dispatch<
        SetStateAction<{ postId?: string; openComments?: boolean } | null>
    >;
    openTransactionsHub: (focusId?: string) => void;
    openProfileTab: () => void;
    closeSettings: () => void;
    openScheduleTab: (opts?: OpenScheduleTabOptions) => void;
    openNotepad: (opts?: { mode?: 'list' | 'create'; focusNoteId?: string }) => void;
    openVaultModal: (opts?: { scanner?: boolean }) => void;
    openUrgentInLawsuitsWorkspace: (caseId?: string) => void;
    openCriminalCase: (caseId: string, options?: { fromLawsuitsWorkspace?: boolean }) => void;
    setActiveFile: Dispatch<SetStateAction<FileData | DashboardExecutionFile | null>>;
    selectCase: (id: string) => void;
    onNavigateToCase?: (caseId: string) => void;
};

export type LawyerDashboardDeferredFeatureSurfacesProps = {
    earlyArm: boolean;
    forceArm: boolean;
    params: DeferredFeatureSurfacesParams;
    onReady: (bag: DeferredFeatureBag) => void;
};

import type { Dispatch, SetStateAction } from 'react';
import type React from 'react';
import type {
    EmployeeSummonsAssignmentState,
    EvictionSubsequentSummonsMeta,
    ExecutionFile,
    PublicationNoticeDebtorState,
    TimelineEvent,
} from '@/app/types/execution';
import type { UnifiedSummonsHubProps } from '@/app/components/lawyer/Modal_Unified_Summons_Hub';

export type SummonsMainTab = 'tabligh' | 'taklif' | 'nashr' | 'guarantor' | null;

export type NotifyOptions = {
    forceExecutionMemo?: boolean;
};

export type SummonsMarkerLike = {
    date?: string;
    purpose?: string;
} | null;

export type ActiveDebtorNoticeScopeLike = {
    notificationDate?: string | null;
    memoAnchorDate?: string | null;
    voluntaryPeriodEndDeclared?: boolean;
};

export interface UnifiedSummonsModalContainerProps {
    showUnifiedSummonsModal: boolean;
    EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode;
    LazyUnifiedSummonsHub: React.ComponentType<UnifiedSummonsHubProps>;

    executionId: string;
    unifiedSummonsTargetDebtorKey: string;
    summonsHubInitialMainTab: SummonsMainTab;
    setSummonsHubInitialMainTab?: Dispatch<SetStateAction<SummonsMainTab>>;
    setSummonsContextDebtorKey?: (debtorKey: string | null) => void;
    setShowUnifiedSummonsModal?: (show: boolean) => void;
    onCloseUnifiedSummonsModal?: () => void;

    primaryDebtorKeyResolved: string;
    isEvictionExecutionModule: boolean;
    setManualGraceCalendarExtra: Dispatch<SetStateAction<boolean>>;
    executionData: ExecutionFile;
    notificationCount: number;
    onUpdate?: (data: ExecutionFile) => void;
    buildDebtorNoticePatchForKey: (
        executionData: ExecutionFile,
        debtorKey: string,
        primaryDebtorKey: string,
        patch: { notificationDate: string }
    ) => Record<string, unknown>;
    executionStorageKey: (id: string) => string;
    storageCache: { set: (key: string, value: unknown) => void };
    handleNotifyDebtor: (
        date: string,
        evictionMeta?: EvictionSubsequentSummonsMeta,
        initialNoticeLawyerFeesIncluded?: boolean,
        purpose?: string,
        notifyOpts?: NotifyOptions
    ) => void;

    subsequentNoticeUnlocked: boolean;
    noticeKindGoalStrictBinding: boolean;
    forcedSummoningAnalysis: { canForceSummon: boolean; lockReasonAr: string };
    followupIsDebtorGovernmentEmployee: boolean;
    followupIsDebtorRetired: boolean;
    activeCoerciveActions: string[];
    activeDebtorIsEmployee: boolean;
    registerDebtorVoluntaryAttendance: () => void;
    openExecutionSeizuresTab: () => void;
    followupDebtorSummonsProfile?: UnifiedSummonsHubProps['summonsProfile'];
    summoningRound: number;
    debtorBrowserTabsMode: boolean;
    followupEarnerForcedActionUnlocked: boolean;
    earnerForcedActionUnlocked: boolean;
    forcedAttendanceIssued: boolean;
    handleForcedAttendance: () => void;
    debtorNotifiedForEvictionGrace: boolean;
    voluntaryEndOptimistic: boolean;
    isEvictionGraceExpiredCalendar: boolean;
    handleDeclareEvictionVoluntaryPeriodEnd: () => void;
    isEvictionGraceEffectivelyExpired: boolean;
    unifiedCollectionApproved: boolean;
    parsedLawyerFees: number;
    debtorEvaded: boolean;
    handleDebtorEvasion: () => void;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    isGracePeriodExpiredNow: boolean;
    debtorAttendedVoluntarily: boolean;
    handleDeclareNoticeVoluntaryPeriodEnd: () => void;
    lawyerStartedPostNoticeExecution: boolean;
    coerciveUiLocked: boolean;
    executionStatus: string;

    employeeAssignmentTabEnabled: boolean;
    resolvedEmployeeSummonsAssignment: EmployeeSummonsAssignmentState | null;
    handleEmployeeAssignmentConfirm: (p: {
        purpose: string;
        notifyDate: string;
        durationDays: number;
    }) => void;
    handleEmployeeAssignmentAttend: () => void;
    handleEmployeeAssignmentDeclareAbsent: () => void;
    handleEmployeeAssignmentTerminate: () => void;
    handleEmployeeAssignmentRequestInvestigation: () => void;
    handleEmployeeRegisterArrestOrder: () => void;
    handleEmployeeAssignmentRequestForcedBring: () => void;
    forcedBringDecisionState: { pending: boolean; rejected: boolean };
    employeeForcedBringAwaitingPersonalOutcome: boolean;
    handleEmployeeAssignmentResolveForcedBringOutcome: (
        outcome: 'brought' | 'absconded' | 'dismissed',
    ) => void;
    handleEmployeeWarrantOutcome: (outcome: 'brought' | 'terminate') => void;
    getPublicationNoticeForDebtorKey: (
        executionData: ExecutionFile,
        debtorKey: string
    ) => PublicationNoticeDebtorState | null;
    handlePublicationNoticeRegister: (p: {
        publicationDateYmd: string;
        newspaper1: string;
        newspaper2: string;
    }) => void;
    handlePublicationNoticeTerminate: () => void;
    handlePublicationNoticeDebtorAttended: () => void;
    activeDebtorNoticeScope: ActiveDebtorNoticeScopeLike;
    scopedSummonsMarker: SummonsMarkerLike;
    terminateDebtorSummonsMarker: () => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    pushTimelineEvent: (
        event: TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> }
    ) => void;
    nextTimelineId: () => string;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;
}

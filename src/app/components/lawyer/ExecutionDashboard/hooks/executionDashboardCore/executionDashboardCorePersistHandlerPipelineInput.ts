// @ts-nocheck
import type { ExecutionFile, TimelineEvent, SeizedAsset, RealEstateSeizureAsset } from '@/app/types/execution';
import type { ExecutionDashboardProps } from '../../types';
import type { DebtorWorkspaceEntry } from '../useDebtorWorkspaceEntries';
import type {
    BreakInventoryFurnitureSavePayload,
    JudicialCustodianSavePayload,
} from '@/app/utils/executorApprovalWorkflow';

/** Phase C Slice 29 — typed input for persist / save / summons pipeline */
export type ExecutionDashboardCorePersistHandlerPipelineInput = {
    effectiveDebtors: unknown[];
    financialPrincipalAmount: number;
    financialLawyerFeesAmount: number;
    claimType: string;
    isNonFinancialClaim: boolean;
    debtorBrowserTabsMode: boolean;
    effectiveFollowupDebtorEntry: DebtorWorkspaceEntry | null | undefined;
    activeWorkspaceDebtorForFollowup: DebtorWorkspaceEntry | null | undefined;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsReloadEpoch: number;
    isEvictionExecutionModule: boolean;
    unifiedCollectionApproved: boolean;
    notificationCount: number;
    forcedAttendanceIssued: boolean;
    coercionOrchestrator: Record<string, unknown>;
    isEvictionGraceExpiredNow: boolean;
    isGracePeriodExpiredNow: boolean;
    debtorNotificationDate: string | null | undefined;
    manualGraceCalendarExtra: boolean;
    lawyerStartedPostNoticeExecution: boolean;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    voluntaryEndOptimistic: boolean;
    isEvictionGraceEffectivelyExpired: boolean;
    activeCoerciveActions: unknown[];
    activeDebtorNoticeScope: unknown;
    debtorSummonsMarkerLocal: ExecutionFile['debtor_summons_marker'] | null;
    monetaryExecutionStrictPathFlag: boolean;
    isAlimonyClaim: boolean;
    executionExtras: Record<string, unknown>;
    unifiedSummonsTargetDebtorKey: string;
    activeDebtorIsDeceased: boolean;
    primaryDebtorKeyResolved: string;
    debtorNotifiedForEvictionGrace: boolean;
    remaining: number;
    daysSinceNoticeCalculated: number;
    executionFeeInjected: boolean;
    showToast: (msg: string, type?: string) => void;
    statuteStatus: unknown;
    showStatuteWarning: boolean;
    setShowStatuteWarning: (v: boolean) => void;
    lastActionDate: string | null;
    timelineEvents: TimelineEvent[];
    caseNotesLog: unknown[];
    caseTasksPending: unknown[];
    financialLedger: unknown;
    gracePeriodActive: boolean;
    gracePeriodEnded: boolean;
    seizedAssets: SeizedAsset[];
    seizureDraftsByDecisionId: Record<string, unknown>;
    realEstateSeizureAssets: RealEstateSeizureAsset[];
    debtorEvaded: boolean;
    arrestWarrantUnlocked: boolean;
    creditorAttended: boolean;
    executionPaused: boolean;
    paidDebt: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    earnerFeeCollectionSm: unknown;
    followupOrchestrator: Record<string, unknown>;
    file: ExecutionDashboardProps['file'];
    currentFileId: string;
    isMaritalFurnitureClaim: boolean;
    nextTimelineId: () => string;
    timelineEventsRef: { current: TimelineEvent[] };
    persistExecutionMergeRef: { current: ((patch: unknown) => void) | undefined };
    pushTimelineEventRef: {
        current:
            | ((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void)
            | null
            | undefined;
    };
    executionFileSnapshotRef: { current: ExecutionFile | null | undefined };
    setShowDecisionsModal: (v: boolean) => void;
    showDecisionsModal: boolean;
    setCaseTasksPending: (v: unknown[]) => void;
    setTimelineEvents: (v: TimelineEvent[] | ((prev: TimelineEvent[]) => TimelineEvent[])) => void;
    setExecutionReportPrompt: (v: unknown) => void;
    setJudicialCustodianModalCtx: (v: unknown) => void;
    setJudicialCustodianModalOpen: (v: boolean) => void;
    setCaseNotesLog: (v: unknown[]) => void;
    decisionsStorageExecutionId: string;
    openBreakInventoryCompletion: (payload: BreakInventoryFurnitureSavePayload) => void;
    openJudicialCustodianCompletion: (payload: JudicialCustodianSavePayload) => void;
    isUnifiedTabActive: boolean;
    unifiedTabId: string;
    onUpdate: ExecutionDashboardProps['onUpdate'];
    executionDataRef: { current: ExecutionFile | null | undefined };
    seizureDraftsByDecisionIdRef: { current: Record<string, unknown> };
    setExecutionStorageTick: (fn: (n: number) => number) => void;
    showExecutionTrashModal: boolean;
    setShowExecutionTrashModal: (v: boolean) => void;
    caseNotesLogRef: { current: unknown[] };
    caseTasksPendingRef: { current: unknown[] };
    setPermanentDeleteTimelineId: (v: string | null) => void;
    viewExecutionData: ExecutionFile | null | undefined;
    isHistoricalMode: boolean;
    activeSubFileId: string | null;
    parentDossierId: string;
    setSeizureDraftsByDecisionId: (v: Record<string, unknown>) => void;
    seizedAssetsSnapshotRef: { current: SeizedAsset[] };
    maritalFurnitureItemsForFollowup: unknown[];
    setActiveCoerciveActions: (v: unknown[]) => void;
};

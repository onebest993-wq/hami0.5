import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type {
    ExecutionFile,
    SeizedAsset,
    SeizedMovable,
    SeizedProperty,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import type { AppealUiPerspective } from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import type { SeizureRequestSubjectModalProps } from './SeizureRequestSubjectModal.types';
import type { VisitationCalendarModalProps } from './VisitationCalendarModal';
import type {
    SeizureLogTab,
    UnifiedSeizureLogEntry,
} from '@/app/components/lawyer/execution/UnifiedSeizureLogModal';

export type GenericHandler = (...args: unknown[]) => unknown;

export type GraceTaskCard = {
    id: string | number;
    title: string;
    body?: string;
    dueDate: string;
};

export type JudicialCustodianRow = {
    id: string;
    fullName: string;
    salary: string;
};

export type FinancialStatusBadge = {
    label: string;
    color: string;
    pulse: boolean;
};

export type ThirdPartyDraftMap = Record<string, string>;
export type ExecutionStatusMetadata = Record<string, unknown> | null | undefined;
export type ExecutionPhoneBodyDeferredViewData =
    | (ExecutionFile & {
          visitationSchedule?: {
              config?: VisitationCalendarModalProps['config'];
              sessions: VisitationCalendarModalProps['sessions'];
          } | null;
      })
    | null
    | undefined;

export type ExecutionDashboardPhoneBodyDeferredScope = {
    activeDebtorIsDeceased?: boolean;
    activeFinancialTab: number;
    accumulatedAlimony: number;
    appealPerspective: AppealUiPerspective;
    appendGuarantorFollowupRequest: (data: { executionId: string | undefined }) => {
        ok: boolean;
        decisionId?: string;
    };
    archiveAndClearGuarantor: () => void;
    assignmentWorkspaceCtx: { activeDebtorKey: string };
    beginThirdPartyReceiveStep: GenericHandler;
    calculatedExecutionFee: number;
    cancelThirdPartyReceiveStep: GenericHandler;
    confirmThirdPartyReceive: GenericHandler;
    claimType: string;
    clearActiveSalarySeizurePath?: () => void;
    closeUnifiedSeizureLog: () => void;
    openUnifiedSeizureLog: () => void;
    decisionsReloadEpoch: number;
    decisionsStorageExecutionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    executionStatus: string;
    executionToolsTimelineLockedUi: boolean;
    evictionAssetsTabUnlocked: boolean;
    evictionCaseExpenses: unknown[];
    evictionCaseExpensesTotalForFinancial: number;
    evictionGraceHidden: boolean;
    evictionGracePinned: boolean;
    evictionLawyerFeesInTotals: number;
    financialHubAutoOpenMode: 'disburse' | null;
    financialHubSeizedMovableId: string | null;
    financialHubSeizedPropertyId: string | null;
    financialLedger: unknown[];
    financialLawyerFeesAmount: number;
    financialPrincipalAmount: number;
    financialStatus: FinancialStatusBadge;
    focusSeizureMovableInlineCompletion: GenericHandler;
    focusSeizurePropertyInlineCompletion: GenericHandler;
    followupSalarySeizureLabel: string;
    followupSpecialization: {
        hideAllGuarantorPresence?: boolean;
    } | null | undefined;
    getLocalTodayYmd?: () => string;
    guarantorFollowupAwaitingDetailsSave: (data: unknown) => boolean;
    handleCoerciveAction: (action: string) => void;
    handleEvictionLawyerFeeRequest: () => void;
    handleEvictionLedgerActivated: () => void;
    handleFundsLedgerPayment: (data: unknown) => void;
    handleGuarantorRequestFromFollowup: () => void;
    isAlimonyClaim: boolean;
    isEvictionExecutionModule: boolean;
    isFinancialCenterExpanded: boolean;
    isMaritalFurnitureClaim: boolean;
    isNonFinancialClaim: boolean;
    isPaused: boolean;
    isRepresentingDebtor: boolean;
    isVisitationClaim: boolean;
    judicialCustodiansResolved: JudicialCustodianRow[];
    lawyerFeePayoutApproved: boolean;
    monthlyAlimony: number;
    movableSeizureRegistryAssets: SeizedAsset[];
    movableSeizureRequestModalOpen: SeizureRequestSubjectModalProps['open'];
    movableSeizureSubjectDraft: SeizureRequestSubjectModalProps['subjectDraft'];
    nextTimelineId: () => string;
    paidClientFees: number;
    paidCourtFees: number;
    paidDebt: number;
    paidDirectorateFees: number;
    parsedClientFees: number;
    parsedCourtFees: number;
    parsedDirectorateFees: number;
    patchSalarySeizureAssetDetails: GenericHandler;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushSeizureAuctionCalendarAppointment: GenericHandler;
    pushTimelineEvent: (event: TimelineEvent) => void;
    realEstateSeizureRegistryAssets: SeizedProperty[];
    releaseSeizureAssetRow: GenericHandler;
    remaining: number;
    salarySeizureRegistryAssets: SeizedAsset[];
    salarySeizureTabRows: SeizedAsset[];
    seizureLogExecutorDecisions: Record<string, unknown>[];
    seizureMatrixLedgerParamsRef: MutableRefObject<UnifiedLedgerTotalParams>;
    setActiveFinancialTab: Dispatch<SetStateAction<number>>;
    setCaseTasksPending: Dispatch<SetStateAction<unknown[]>>;
    setEvictionGraceHidden: Dispatch<SetStateAction<boolean>>;
    setFinancialHubAutoOpenMode: Dispatch<SetStateAction<'disburse' | null>>;
    setFinancialHubSeizedMovableId: Dispatch<SetStateAction<string | null>>;
    setFinancialHubSeizedPropertyId: Dispatch<SetStateAction<string | null>>;
    setIsFinancialCenterExpanded: Dispatch<SetStateAction<boolean>>;
    setJudicialCustodianModalCtx: Dispatch<
        SetStateAction<{
            requestTitle: string;
            initialName: string;
            initialSalary: string;
            onSaved: (payload: { name: string; salary: string }) => void;
        } | null>
    >;
    setJudicialCustodianModalOpen: Dispatch<SetStateAction<boolean>>;
    setMovableSeizureRequestModalOpen: Dispatch<SetStateAction<boolean>>;
    setMovableSeizureSubjectDraft: SeizureRequestSubjectModalProps['onSubjectDraftChange'];
    setPropertySeizureRequestModalOpen: Dispatch<SetStateAction<boolean>>;
    setPropertySeizureSubjectDraft: SeizureRequestSubjectModalProps['onSubjectDraftChange'];
    setShowExecutionFinancialHub: Dispatch<SetStateAction<boolean>>;
    setShowVisitationCalendarModal: Dispatch<SetStateAction<boolean>>;
    setThirdPartyFundsDraftById: Dispatch<SetStateAction<ThirdPartyDraftMap>>;
    setThirdPartySeizuresUi: Dispatch<SetStateAction<ThirdPartySeizure[]>>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setUnifiedLedgerRevision: Dispatch<SetStateAction<number>>;
    setUnifiedSeizureLogTab: (tab: string) => void;
    showExecutionFinancialHub: boolean;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        options?: unknown,
    ) => void;
    showUnifiedSeizureLogModal: boolean;
    showVisitationCalendarModal: VisitationCalendarModalProps['open'];
    standaloneExecutionMarks: SeizedAsset[];
    statusMetadata: ExecutionStatusMetadata;
    submitMovableSeizureRequest: SeizureRequestSubjectModalProps['onSubmit'];
    submitPropertySeizureRequest: SeizureRequestSubjectModalProps['onSubmit'];
    thirdPartyFundsDraftById: ThirdPartyDraftMap;
    thirdPartySeizureRegistryAssets: ThirdPartySeizureAsset[];
    thirdPartySeizuresUi: ThirdPartySeizure[];
    timelineDebtorMetadata: (debtorKey: string) => Record<string, unknown>;
    todayYmd: string;
    totalOwed: number;
    totalWithExecutionFee: number;
    total_execution_expenses: number;
    unifiedSeizureLogEntries: UnifiedSeizureLogEntry[];
    unifiedSeizureLogTab: SeizureLogTab;
    unifiedSeizureTabCounts: {
        property: number;
        salary: number;
        movable: number;
        third_party: number;
    };
    updateThirdPartyReceiveDraft: GenericHandler;
    viewExecutionData: ExecutionPhoneBodyDeferredViewData;
    visitChildNames: string[];
    propertySeizureRequestModalOpen: SeizureRequestSubjectModalProps['open'];
    propertySeizureSubjectDraft: SeizureRequestSubjectModalProps['subjectDraft'];
    graceHiddenKey: string | null | undefined;
    shouldCalculateExecutionFee: boolean;
    daysSinceNoticeCalculated: number;
    gracePeriodEnded: boolean;
    initiator: string;
    hasUnifiedSeizureLogContent: boolean;
    seizedPropertiesForSeizureLog: SeizedProperty[];
    seizedMovablesForSeizureLog: SeizedMovable[];
};

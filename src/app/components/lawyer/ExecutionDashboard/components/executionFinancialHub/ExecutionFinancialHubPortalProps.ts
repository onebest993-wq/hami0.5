import type React from 'react';
import type {
    ExecutionFile,
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizureAsset,
    TimelineEvent,
} from '@/app/types/execution';
import type { ExecutionStatusMeta } from '@/app/utils/executionStateMachine';
import type { FinancialOperationsCenterProps } from '@/app/slices/financial/specialtyPublic';
import type { FinancialLedgerEntry } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardPaymentHandlers';
import type { EvictionCaseExpenseRow } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/useExecutionDashboardEvictionFinancialHandlers';

export type ExecutionFinancialHubToastOptions = {
    decisionsLink?: boolean;
    decisionsTab?: 'current' | 'previous' | 'appeals';
    decisionId?: string;
    action?: { label: string; onClick: () => void };
};

export type ExecutionFinancialHubFundsLedgerPayment = {
    amount: number;
    kind: 'full' | 'partial';
    description: string;
};

export type ExecutionFinancialHubCaseTaskPending = NonNullable<
    ExecutionFile['caseTasksPending']
>[number];

export interface ExecutionFinancialHubPortalProps {
    showExecutionFinancialHub: boolean;
    /** إغلاق المركز المالي — يُفضَّل onCloseFinancialHub من مسار الهاتف */
    setShowExecutionFinancialHub?: (v: boolean) => void;
    onCloseFinancialHub?: () => void;
    onOpenUnifiedSeizureLog?: () => void;
    financialHubAutoOpenMode: 'disburse' | null;
    setFinancialHubAutoOpenMode: React.Dispatch<React.SetStateAction<'disburse' | null>>;
    financialHubSeizedMovableId: string | null;
    setFinancialHubSeizedMovableId: React.Dispatch<React.SetStateAction<string | null>>;
    financialHubSeizedPropertyId: string | null;
    setFinancialHubSeizedPropertyId: React.Dispatch<React.SetStateAction<string | null>>;
    EXEC_MODAL_BACKDROP_STRONG: string;
    EXEC_MODAL_Z: { unifiedFollowUp: number };
    LazyFinancialOperationsCenter: React.ComponentType<FinancialOperationsCenterProps> & {
        preload?: () => Promise<void>;
        isPreloaded?: () => boolean;
    };
    EXEC_FOC_LAZY_FALLBACK: React.ReactNode;
    realEstateSeizureRegistryAssets: RealEstateSeizureAsset[] | unknown[];
    movableSeizureRegistryAssets: SeizedAsset[] | unknown[];
    salarySeizureRegistryAssets: SeizedAsset[] | unknown[];
    thirdPartySeizureRegistryAssets: ThirdPartySeizureAsset[] | unknown[];
    standaloneExecutionMarks: StandaloneExecutionMark[] | unknown[];
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    isFinancialCenterExpanded: boolean;
    setIsFinancialCenterExpanded?: React.Dispatch<React.SetStateAction<boolean>>;
    onToggleFinancialCenterExpanded?: () => void;
    activeFinancialTab: number;
    setActiveFinancialTab: React.Dispatch<React.SetStateAction<number>>;
    principalDebtAmount: number;
    evictionLawyerFeesInTotals: number;
    isEvictionExecutionModule: boolean;
    parsedLawyerFees: number;
    total_execution_expenses: number;
    monthlyAlimony: number;
    totalOwed: number;
    remaining: number;
    parsedCourtFees: number;
    parsedDirectorateFees: number;
    parsedClientFees: number;
    financialStatus: { label: string; color: string; pulse: boolean };
    isNonFinancialClaim: boolean;
    isAlimonyClaim: boolean;
    claimType: string;
    paidDebt: number;
    totalWithExecutionFee: number;
    calculatedExecutionFee: number;
    shouldCalculateExecutionFee: boolean;
    accumulatedAlimony: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    daysSinceNoticeCalculated: number;
    gracePeriodEnded: boolean;
    initiator: string;
    setShowPaymentCalculator?: (v: boolean) => void;
    onOpenPaymentCalculator?: () => void;
    setShowSettlementCalculator?: (v: boolean) => void;
    onOpenSettlementCalculator?: () => void;
    handleCoerciveAction: (action: string) => void;
    executionStatus: string;
    statusMetadata: ExecutionStatusMeta | null | undefined;
    isPaused: boolean;
    setShowLedgerModal?: (v: boolean) => void;
    onOpenLedgerModal?: () => void;
    financialLedger: FinancialLedgerEntry[];
    evictionCaseExpensesTotalForFinancial: number;
    evictionCaseExpenses: EvictionCaseExpenseRow[];
    setShowEvictionExpenseModal?: (v: boolean) => void;
    onOpenEvictionExpenseModal?: () => void;
    handleEvictionLawyerFeeRequest: () => void;
    lawyerFeePayoutApproved: boolean;
    handleFundsLedgerPayment: (data: ExecutionFinancialHubFundsLedgerPayment) => void;
    setTimelineEvents: React.Dispatch<React.SetStateAction<TimelineEvent[]>>;
    nextTimelineId: () => string;
    guarantorFollowupAwaitingDetailsSave: (
        data: ExecutionFile['guarantor_followup'] | null | undefined
    ) => boolean;
    setShowUnifiedExecutionModal?: (v: boolean) => void;
    setExecutionDebtorTabIndex?: (v: number) => void;
    primaryDebtorWorkspaceKey?: string | undefined;
    expandDebtor?: (debtorKey: string) => void;
    openGuarantorDetailsModal?: () => void;
    onOpenGuarantorFollowupDetails?: () => void;
    appendGuarantorFollowupRequest: (data: { executionId: string | undefined }) => {
        ok: boolean;
        decisionId?: string;
    };
    decisionsStorageExecutionId: string | undefined;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        options?: ExecutionFinancialHubToastOptions
    ) => void;
    timelineDebtorMetadata: (debtorKey: string) => Record<string, unknown>;
    assignmentWorkspaceCtx: { activeDebtorKey: string };
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    handleEvictionLedgerActivated: () => void;
    evictionAssetsTabUnlocked: boolean;
    getLocalTodayYmd: () => string;
    setCaseTasksPending: React.Dispatch<React.SetStateAction<ExecutionFinancialHubCaseTaskPending[]>>;
    onClearSalarySeizurePath?: () => void;
    isRepresentingDebtor?: boolean;
    activeDebtorIsDeceased?: boolean;
}

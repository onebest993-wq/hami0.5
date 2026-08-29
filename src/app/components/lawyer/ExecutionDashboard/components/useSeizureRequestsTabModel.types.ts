import type { InlineActionGateKey } from '../types';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { SeizureMatrixResult } from '@/app/utils/seizureMatrix';

export type ToastOptions = { decisionsLink?: boolean; [key: string]: unknown };

export type DecisionRow = Record<string, unknown> & {
    id?: string;
    title?: string;
    requestKind?: string;
    seizureSubtype?: string;
    executorOutcome?: string;
    seizureRequestSavedAt?: string;
    resolvedAt?: string;
    date?: string;
};

export type UseSeizureRequestsTabModelParams = {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    remainingBalanceIqd?: number;
    seizureMatrix?: SeizureMatrixResult;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    pushTimelineEvent: (event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void;
    nextTimelineId: () => string;
    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info',
        options?: ToastOptions
    ) => void;
    activeDebtorIsDeceased: boolean;
    activeDebtorIsEmployee?: boolean;
    executionCoerciveButtonDisabled: boolean;
    coerciveUiLocked: boolean;
    isHistoricalMode: boolean;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    requestFollowupSeizureDecision: (subtype: 'third_party', title: string, body: string) => void;
    hideAllGuarantorPresence?: boolean;
    financialGuarantorRequestOnly?: boolean;
    isFinancialDebtCollectionClaim?: boolean;
    settlementBreachTriggeredAt?: string | null;
    ledgerPendingSettlement?: unknown;
    persistExecutionMerge?: (patch: Record<string, unknown>) => void;
};

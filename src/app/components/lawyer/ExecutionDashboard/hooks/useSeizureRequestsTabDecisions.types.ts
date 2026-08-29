import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { InlineActionGateKey } from '../types';

export type SeizureDecisionRow = Record<string, unknown> & {
    id?: string;
    title?: string;
    requestKind?: string;
    seizureSubtype?: string;
    executorOutcome?: string;
    seizureRequestSavedAt?: string;
    resolvedAt?: string;
    date?: string;
};

export function decisionRowId(row: Record<string, unknown> | null | undefined): string {
    return String(row?.id ?? '').trim();
}

export function decisionRowStamp(row: Record<string, unknown> | null | undefined): string {
    return String(row?.resolvedAt ?? row?.date ?? '');
}

export type UseSeizureRequestsTabDecisionsParams = {
    executionId: string | undefined;
    executionData: ExecutionFile | null;
    seizureActionsDisabled: boolean;
    coerciveUiLocked?: boolean;
    showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info', options?: unknown) => void;
    saveCoerciveAction: (actionType: string, details: Record<string, string>) => void;
    pushTimelineEvent: (event: TimelineEvent) => void;
    nextTimelineId: () => string;
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    persistExecutionMerge?: (patch: Record<string, unknown>) => void;
    activeDebtorIsDeceased?: boolean;
};

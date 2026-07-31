/** أنواع نتيجة قرار الحجز — منفصلة عن المعالج الثقيل */
import type React from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';

export type SeizureDecisionOutcomeDetail = {
    executionId?: string;
    decisionId?: string;
    requestKind?: string;
    outcome?: 'approved' | 'rejected';
};

export type SeizureDecisionOutcomeContext = {
    executionDataId?: string;
    executionId?: string;
    decisionsStorageExecutionId?: string;
    nextTimelineId: () => string;
    applyThirdPartySeizuresFromPatch: (patch: Record<string, unknown>) => void;
    executionDataRef: React.MutableRefObject<ExecutionFile | null>;
    persistExecutionMergeRef: React.MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    pushTimelineEventRef: React.MutableRefObject<
        ((event: TimelineEvent, options?: { mergePatch?: Record<string, unknown> }) => void) | null
    >;
    seizureMatrixLedgerParamsRef: React.MutableRefObject<UnifiedLedgerTotalParams | null>;
    focusSeizurePropertyInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureMovableInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureThirdPartyInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureNoticeInlineRef: React.MutableRefObject<(decisionId: string, subject?: string) => void>;
    openSeizureRequestsTabRef: React.MutableRefObject<() => void>;
    setShowCoerciveActionForm: React.Dispatch<React.SetStateAction<string | null>>;
    setSeizureDetailCompletion: React.Dispatch<
        React.SetStateAction<{
            decisionRowId: string;
            assetId: string;
            actionType: 'salary' | 'property' | 'vehicle';
        } | null>
    >;
    setShowUnifiedExecutionModal: (open: boolean) => void;
    setUnifiedLedgerRevision: React.Dispatch<React.SetStateAction<number>>;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
};

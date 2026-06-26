import type { MutableRefObject } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import type { ExecutionDomainOrchestratorSlice } from './executionOrchestratorSliceTypes';

/** مفتاح ملف التنفيذ — يُستخدم لمزامنة الحالة عند تبديل الإضبارة */
export type ExecutionFileKey = string;

export type ExecutionModalSetter = (
    key:
        | 'showUnifiedExecutionModal'
        | 'showCoerciveModal'
        | 'showUnifiedSummonsModal'
        | 'showDecisionsModal'
        | 'showNotesModal'
        | 'showDocumentsModal'
        | 'showAppointmentModal'
        | 'showTimelineModal'
        | 'showSeizedAssetsModal'
        | 'showPaymentModal'
        | 'showNotificationModal'
        | 'showPauseModal'
        | 'showLedgerModal'
        | 'showPaymentCalculator'
        | 'showSettlementCalculator',
    show: boolean,
) => void;

export type ExecutionOrchestratorCoreInput = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    executionFileKey: ExecutionFileKey;
    executionDashboardFileId: string | null;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    decisionsStorageExecutionId: string | undefined;
    setExecutionModal: ExecutionModalSetter;
    showUnifiedExecutionModal: boolean;
    showDecisionsModal: boolean;
    setShowDecisionsModal: (show: boolean) => void;
    focusSeizurePropertyInlineRef: MutableRefObject<(decisionId: string, subject?: string) => void>;
    focusSeizureMovableInlineRef: MutableRefObject<(decisionId: string, subject?: string) => void>;
};

/** شريحة orchestrator عامة — للـ followup/seizure حتى اكتمال typed slices */
export type ExecutionOrchestratorSlice = Record<string, unknown>;

export function mergeOrchestratorSlices<T extends ExecutionDomainOrchestratorSlice>(
    ...slices: Array<T | ExecutionOrchestratorSlice>
): T & ExecutionOrchestratorSlice {
    return Object.assign({}, ...slices) as T & ExecutionOrchestratorSlice;
}

export type { ExecutionDomainOrchestratorSlice } from './executionOrchestratorSliceTypes';
export type {
    ExecutionFinancialOrchestratorSlice,
    ExecutionDossierTabOrchestratorSlice,
    ExecutionDossierLifecyclePanelOrchestratorSlice,
    ExecutionDossierLifecycleActionsOrchestratorSlice,
    ExecutionPartiesOrchestratorSlice,
    DossierLifecyclePopStyle,
} from './executionOrchestratorSliceTypes';

/** Phase C Slice 24 — مستمعو نتائج الحجز/الدفتر بعد claim financials */
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, SeizedAsset, TimelineEvent } from '@/app/types/execution';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import type { ThirdPartySeizure } from '@/app/types/execution';
import { useThirdPartyFundsReceivedOutcome } from '../useThirdPartyFundsReceivedOutcome';
import { useSeizureDecisionOutcome } from '../useSeizureDecisionOutcome';
import { useUnifiedCollectionOutcome } from '../useUnifiedCollectionOutcome';
import { useGuarantorRequestOutcome } from '../useGuarantorRequestOutcome';
import { useOpenSeizureCompletion } from '../useOpenSeizureCompletion';
import { useTrustDisbursedOutcome } from '../useTrustDisbursedOutcome';
import { useOpenFinancialHubLedger } from '../useOpenFinancialHubLedger';
import type { SeizureDecisionOutcomeContext } from '@/app/components/lawyer/ExecutionDashboard/utils/seizureDecisionOutcomeHandler.types';
import type { FinancialHubLedgerOpenContext } from '@/app/components/lawyer/ExecutionDashboard/utils/financialHubLedgerOpenHandler';

type ShowToast = (msg: string, type?: string) => void;

export type ExecutionDashboardSeizureLedgerOutcomeEffectsInput = {
    executionDataRef: MutableRefObject<ExecutionFile | null>;
    executionDataId: string | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    setThirdPartySeizuresUi: Dispatch<SetStateAction<ThirdPartySeizure[]>>;
    clearThirdPartyFundsDraft: (seizureId: string) => void;
    getLedgerParams: () => UnifiedLedgerTotalParams | null;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    nextTimelineId: () => string;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    onLedgerRevision: () => void;
    showToast: ShowToast;
    applyThirdPartySeizuresFromPatch: SeizureDecisionOutcomeContext['applyThirdPartySeizuresFromPatch'];
    pushTimelineEventRef: SeizureDecisionOutcomeContext['pushTimelineEventRef'];
    seizureMatrixLedgerParamsRef: MutableRefObject<UnifiedLedgerTotalParams | null>;
    focusSeizurePropertyInlineRef: SeizureDecisionOutcomeContext['focusSeizurePropertyInlineRef'];
    focusSeizureMovableInlineRef: SeizureDecisionOutcomeContext['focusSeizureMovableInlineRef'];
    focusSeizureThirdPartyInlineRef: SeizureDecisionOutcomeContext['focusSeizureThirdPartyInlineRef'];
    focusSeizureNoticeInlineRef: SeizureDecisionOutcomeContext['focusSeizureNoticeInlineRef'];
    openSeizureRequestsTabRef: SeizureDecisionOutcomeContext['openSeizureRequestsTabRef'];
    setShowCoerciveActionForm: SeizureDecisionOutcomeContext['setShowCoerciveActionForm'];
    setSeizureDetailCompletion: SeizureDecisionOutcomeContext['setSeizureDetailCompletion'];
    setShowUnifiedExecutionModal: SeizureDecisionOutcomeContext['setShowUnifiedExecutionModal'];
    setUnifiedLedgerRevision: Dispatch<SetStateAction<number>>;
    setEvictionAssetsTabUnlocked: (v: boolean) => void;
    seizedAssetsSnapshotRef: MutableRefObject<SeizedAsset[]>;
    setSeizedAssets: Dispatch<SetStateAction<SeizedAsset[]>>;
    setFinancialHubAutoOpenMode: FinancialHubLedgerOpenContext['setFinancialHubAutoOpenMode'];
    setFinancialHubSeizedMovableId: FinancialHubLedgerOpenContext['setFinancialHubSeizedMovableId'];
    setFinancialHubSeizedPropertyId: FinancialHubLedgerOpenContext['setFinancialHubSeizedPropertyId'];
    openFinancialHubLedger: FinancialHubLedgerOpenContext['openFinancialHubLedger'];
};

export function useExecutionDashboardSeizureLedgerOutcomeEffects(
    p: ExecutionDashboardSeizureLedgerOutcomeEffectsInput,
) {
    useThirdPartyFundsReceivedOutcome({
        executionDataRef: p.executionDataRef,
        executionDataId: p.executionDataId,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        setThirdPartySeizuresUi: p.setThirdPartySeizuresUi,
        clearThirdPartyFundsDraft: p.clearThirdPartyFundsDraft,
        getLedgerParams: p.getLedgerParams,
        setTimelineEvents: p.setTimelineEvents,
        nextTimelineId: p.nextTimelineId,
        persistExecutionMergeRef: p.persistExecutionMergeRef,
        onLedgerRevision: p.onLedgerRevision,
        showToast: p.showToast,
    });

    useSeizureDecisionOutcome({
        executionDataId: p.executionDataId,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        nextTimelineId: p.nextTimelineId,
        applyThirdPartySeizuresFromPatch: p.applyThirdPartySeizuresFromPatch,
        executionDataRef: p.executionDataRef,
        persistExecutionMergeRef: p.persistExecutionMergeRef,
        pushTimelineEventRef: p.pushTimelineEventRef,
        seizureMatrixLedgerParamsRef: p.seizureMatrixLedgerParamsRef,
        focusSeizurePropertyInlineRef: p.focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef: p.focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef: p.focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef: p.focusSeizureNoticeInlineRef,
        openSeizureRequestsTabRef: p.openSeizureRequestsTabRef,
        setShowCoerciveActionForm: p.setShowCoerciveActionForm,
        setSeizureDetailCompletion: p.setSeizureDetailCompletion,
        setShowUnifiedExecutionModal: p.setShowUnifiedExecutionModal,
        setUnifiedLedgerRevision: p.setUnifiedLedgerRevision,
        showToast: p.showToast,
    });

    useUnifiedCollectionOutcome({
        executionDataId: p.executionDataId,
        executionId: p.executionId,
        setEvictionAssetsTabUnlocked: p.setEvictionAssetsTabUnlocked,
        persistExecutionMergeRef: p.persistExecutionMergeRef,
        showToast: p.showToast,
    });

    useGuarantorRequestOutcome({
        executionDataId: p.executionDataId,
        executionId: p.executionId,
        showToast: p.showToast,
    });

    useOpenSeizureCompletion({
        executionDataId: p.executionDataId,
        executionId: p.executionId,
        executionDataRef: p.executionDataRef,
        persistExecutionMergeRef: p.persistExecutionMergeRef,
        pushTimelineEventRef: p.pushTimelineEventRef,
        nextTimelineId: p.nextTimelineId,
        focusSeizurePropertyInlineRef: p.focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef: p.focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef: p.focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef: p.focusSeizureNoticeInlineRef,
        seizedAssetsSnapshotRef: p.seizedAssetsSnapshotRef,
        setSeizedAssets: p.setSeizedAssets,
        setSeizureDetailCompletion: p.setSeizureDetailCompletion,
    });

    useTrustDisbursedOutcome({
        executionDataId: p.executionDataId,
        executionId: p.executionId,
        executionDataRef: p.executionDataRef,
        persistExecutionMergeRef: p.persistExecutionMergeRef,
    });

    useOpenFinancialHubLedger({
        executionDataId: p.executionDataId,
        executionId: p.executionId,
        executionDataRef: p.executionDataRef,
        seizureMatrixLedgerParamsRef: p.seizureMatrixLedgerParamsRef,
        pushTimelineEventRef: p.pushTimelineEventRef,
        nextTimelineId: p.nextTimelineId,
        setUnifiedLedgerRevision: p.setUnifiedLedgerRevision,
        showToast: p.showToast,
        setFinancialHubAutoOpenMode: p.setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId: p.setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId: p.setFinancialHubSeizedPropertyId,
        openFinancialHubLedger: p.openFinancialHubLedger,
    });
}

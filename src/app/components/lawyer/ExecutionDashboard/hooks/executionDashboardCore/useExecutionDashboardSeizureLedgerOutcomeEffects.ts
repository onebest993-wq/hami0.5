// @ts-nocheck
/** Phase C Slice 24 — مستمعو نتائج الحجز/الدفتر بعد claim financials */
import { useThirdPartyFundsReceivedOutcome } from '../useThirdPartyFundsReceivedOutcome';
import { useSeizureDecisionOutcome } from '../useSeizureDecisionOutcome';
import { useUnifiedCollectionOutcome } from '../useUnifiedCollectionOutcome';
import { useGuarantorRequestOutcome } from '../useGuarantorRequestOutcome';
import { useOpenSeizureCompletion } from '../useOpenSeizureCompletion';
import { useTrustDisbursedOutcome } from '../useTrustDisbursedOutcome';
import { useOpenFinancialHubLedger } from '../useOpenFinancialHubLedger';

export function useExecutionDashboardSeizureLedgerOutcomeEffects(p: {
    executionDataRef: { current: unknown };
    executionDataId: string | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    setThirdPartySeizuresUi: (v: unknown) => void;
    clearThirdPartyFundsDraft: () => void;
    getLedgerParams: () => unknown;
    setTimelineEvents: (v: unknown) => void;
    nextTimelineId: () => string;
    persistExecutionMergeRef: { current: unknown };
    onLedgerRevision: () => void;
    showToast: (msg: string, type?: string) => void;
    applyThirdPartySeizuresFromPatch: (...args: unknown[]) => unknown;
    pushTimelineEventRef: { current: unknown };
    seizureMatrixLedgerParamsRef: { current: unknown };
    focusSeizurePropertyInlineRef: { current: unknown };
    focusSeizureMovableInlineRef: { current: unknown };
    focusSeizureThirdPartyInlineRef: { current: unknown };
    focusSeizureNoticeInlineRef: { current: unknown };
    openSeizureRequestsTabRef: { current: unknown };
    setShowCoerciveActionForm: (v: boolean) => void;
    setSeizureDetailCompletion: (v: unknown) => void;
    setShowUnifiedExecutionModal: (v: boolean) => void;
    setUnifiedLedgerRevision: (fn: (v: number) => number) => void;
    setEvictionAssetsTabUnlocked: (v: boolean) => void;
    seizedAssetsSnapshotRef: { current: unknown };
    setSeizedAssets: (v: unknown) => void;
    setFinancialHubAutoOpenMode: (v: unknown) => void;
    setFinancialHubSeizedMovableId: (v: unknown) => void;
    setFinancialHubSeizedPropertyId: (v: unknown) => void;
    openFinancialHubLedger: (...args: unknown[]) => unknown;
}) {
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

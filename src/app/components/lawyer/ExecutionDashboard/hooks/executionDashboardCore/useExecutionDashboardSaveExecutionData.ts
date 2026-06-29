// @ts-nocheck
/** Phase C Slice 16 — حفظ لقطة الإضبارة عند الإغلاق/إجراءات محددة */
import { useCallback } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { persistExecutionDashboardSnapshot } from './persistExecutionDashboardSnapshot';
import { useExecutionDashboardSaveOnUnmount } from './useExecutionDashboardRuntimeSyncEffects';

export type UseExecutionDashboardSaveExecutionDataParams = {
    executionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    debtorNotificationDate: string | null | undefined;
    debtorSummonsMarkerLocal: unknown;
    lastActionDate: string | null | undefined;
    executionFeeInjected: boolean;
    timelineEvents: ExecutionFile['timelineEvents'];
    caseNotesLog: ExecutionFile['caseNotesLog'];
    caseTasksPending: ExecutionFile['caseTasksPending'];
    financialLedger: ExecutionFile['financialLedger'];
    gracePeriodActive: boolean;
    gracePeriodEnded: boolean;
    seizedAssets: ExecutionFile['seizedAssets'];
    seizureDraftsByDecisionId: ExecutionFile['seizureDraftsByDecisionId'];
    realEstateSeizureAssets: ExecutionFile['realEstateSeizureAssets'];
    activeCoerciveActions: ExecutionFile['activeCoerciveActions'];
    notificationCount: number;
    forcedAttendanceIssued: boolean;
    debtorEvaded: boolean;
    arrestWarrantUnlocked: boolean;
    creditorAttended: boolean;
    executionPaused: boolean;
    activeNoticeState: unknown;
    debtorAttendedVoluntarily: boolean;
    debtorForcedToAttend: boolean;
    debtorArrested: boolean;
    nonInterferenceIssued: boolean;
    paidDebt: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    summoningRound: number;
    voluntaryAttendanceCount: number;
    investigationCourtRequested: boolean;
    investigationMemoIssued: boolean;
    investigationPathDebtorPresent: boolean;
    forcedPathAttendanceSecured: boolean;
    evictionVacateDeadlineLocal: string | null | undefined;
    evictionResidentialGracePeriodStart: string | null | undefined;
    evictionExecutorVacateGrantApproved: boolean | null | undefined;
    evictionResidentialGraceManuallyEndedAt: string | null | undefined;
    evictionAssetsTabUnlocked: boolean;
    evictionCaseExpenses: unknown;
    encroachmentCaseExpenses: unknown;
    specificDeliveryCaseExpenses: unknown;
    earnerFeeCollectionSm: unknown;
};

export function useExecutionDashboardSaveExecutionData(
    p: UseExecutionDashboardSaveExecutionDataParams,
): () => void {
    const saveExecutionData = useCallback(() => {
        persistExecutionDashboardSnapshot({
            executionId: p.executionId,
            executionData: p.executionData,
            debtorNotificationDate: p.debtorNotificationDate,
            debtorSummonsMarkerLocal: p.debtorSummonsMarkerLocal,
            lastActionDate: p.lastActionDate,
            executionFeeInjected: p.executionFeeInjected,
            timelineEvents: p.timelineEvents,
            caseNotesLog: p.caseNotesLog,
            caseTasksPending: p.caseTasksPending,
            financialLedger: p.financialLedger,
            gracePeriodActive: p.gracePeriodActive,
            gracePeriodEnded: p.gracePeriodEnded,
            seizedAssets: p.seizedAssets,
            seizureDraftsByDecisionId: p.seizureDraftsByDecisionId,
            realEstateSeizureAssets: p.realEstateSeizureAssets,
            activeCoerciveActions: p.activeCoerciveActions,
            notificationCount: p.notificationCount,
            forcedAttendanceIssued: p.forcedAttendanceIssued,
            debtorEvaded: p.debtorEvaded,
            arrestWarrantUnlocked: p.arrestWarrantUnlocked,
            creditorAttended: p.creditorAttended,
            executionPaused: p.executionPaused,
            activeNoticeState: p.activeNoticeState,
            debtorAttendedVoluntarily: p.debtorAttendedVoluntarily,
            debtorForcedToAttend: p.debtorForcedToAttend,
            debtorArrested: p.debtorArrested,
            nonInterferenceIssued: p.nonInterferenceIssued,
            paidDebt: p.paidDebt,
            paidCourtFees: p.paidCourtFees,
            paidDirectorateFees: p.paidDirectorateFees,
            paidClientFees: p.paidClientFees,
            summoningRound: p.summoningRound,
            voluntaryAttendanceCount: p.voluntaryAttendanceCount,
            investigationCourtRequested: p.investigationCourtRequested,
            investigationMemoIssued: p.investigationMemoIssued,
            investigationPathDebtorPresent: p.investigationPathDebtorPresent,
            forcedPathAttendanceSecured: p.forcedPathAttendanceSecured,
            evictionVacateDeadlineLocal: p.evictionVacateDeadlineLocal,
            evictionResidentialGracePeriodStart: p.evictionResidentialGracePeriodStart,
            evictionExecutorVacateGrantApproved: p.evictionExecutorVacateGrantApproved,
            evictionResidentialGraceManuallyEndedAt: p.evictionResidentialGraceManuallyEndedAt,
            evictionAssetsTabUnlocked: p.evictionAssetsTabUnlocked,
            evictionCaseExpenses: p.evictionCaseExpenses,
            encroachmentCaseExpenses: p.encroachmentCaseExpenses,
            specificDeliveryCaseExpenses: p.specificDeliveryCaseExpenses,
            earnerFeeCollectionSm: p.earnerFeeCollectionSm,
        });
    }, [
        p.executionId,
        p.executionData,
        p.debtorNotificationDate,
        p.debtorSummonsMarkerLocal,
        p.lastActionDate,
        p.executionFeeInjected,
        p.timelineEvents,
        p.caseNotesLog,
        p.caseTasksPending,
        p.financialLedger,
        p.gracePeriodActive,
        p.gracePeriodEnded,
        p.seizedAssets,
        p.seizureDraftsByDecisionId,
        p.realEstateSeizureAssets,
        p.activeCoerciveActions,
        p.notificationCount,
        p.forcedAttendanceIssued,
        p.debtorEvaded,
        p.arrestWarrantUnlocked,
        p.creditorAttended,
        p.executionPaused,
        p.activeNoticeState,
        p.debtorAttendedVoluntarily,
        p.debtorForcedToAttend,
        p.debtorArrested,
        p.nonInterferenceIssued,
        p.paidDebt,
        p.paidCourtFees,
        p.paidDirectorateFees,
        p.paidClientFees,
        p.summoningRound,
        p.voluntaryAttendanceCount,
        p.investigationCourtRequested,
        p.investigationMemoIssued,
        p.investigationPathDebtorPresent,
        p.forcedPathAttendanceSecured,
        p.evictionVacateDeadlineLocal,
        p.evictionResidentialGracePeriodStart,
        p.evictionExecutorVacateGrantApproved,
        p.evictionResidentialGraceManuallyEndedAt,
        p.evictionAssetsTabUnlocked,
        p.evictionCaseExpenses,
        p.encroachmentCaseExpenses,
        p.specificDeliveryCaseExpenses,
        p.earnerFeeCollectionSm,
    ]);

    useExecutionDashboardSaveOnUnmount(saveExecutionData);

    return saveExecutionData;
}

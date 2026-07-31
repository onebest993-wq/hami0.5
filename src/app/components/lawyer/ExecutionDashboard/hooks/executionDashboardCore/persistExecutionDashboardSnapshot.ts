import type { ExecutionFile } from '@/app/types/execution';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import { debug } from '@/app/utils/debug';

export type ExecutionDashboardPersistSnapshot = {
    executionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    /** مرجع حيّ اختياري — بعض مسارات الحفظ تفضّل القراءة من ref */
    executionDataRef?: { current: ExecutionFile | null | undefined };
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

/** يحفظ لقطة الإضبارة في storageCache — يُستدعى عند الإغلاق أو إجراءات محددة */
export function persistExecutionDashboardSnapshot(snapshot: ExecutionDashboardPersistSnapshot): void {
    const persistKey = String(snapshot.executionData?.id ?? snapshot.executionId ?? '');
    if (!persistKey || persistKey === 'undefined') return;

    const base = snapshot.executionData;
    if (!base) return;

    try {
        const updatedData = {
            ...base,
            debtorNotificationDate: snapshot.debtorNotificationDate,
            debtor_summons_marker: snapshot.debtorSummonsMarkerLocal,
            lastActionDate: snapshot.lastActionDate,
            executionFeeInjected: snapshot.executionFeeInjected,
            timelineEvents: snapshot.timelineEvents,
            caseNotesLog: snapshot.caseNotesLog,
            caseTasksPending: snapshot.caseTasksPending,
            financialLedger: snapshot.financialLedger,
            gracePeriodActive: snapshot.gracePeriodActive,
            gracePeriodEnded: snapshot.gracePeriodEnded,
            seizedAssets: snapshot.seizedAssets,
            seizureDraftsByDecisionId: snapshot.seizureDraftsByDecisionId,
            realEstateSeizureAssets: snapshot.realEstateSeizureAssets,
            activeCoerciveActions: snapshot.activeCoerciveActions,
            notificationCount: snapshot.notificationCount,
            forcedAttendanceIssued: snapshot.forcedAttendanceIssued,
            debtorEvaded: snapshot.debtorEvaded,
            arrestWarrantUnlocked: snapshot.arrestWarrantUnlocked,
            creditorAttended: snapshot.creditorAttended,
            executionPaused: snapshot.executionPaused,
            activeNoticeState: snapshot.activeNoticeState,
            debtorAttendedVoluntarily: snapshot.debtorAttendedVoluntarily,
            debtorForcedToAttend: snapshot.debtorForcedToAttend,
            debtorArrested: snapshot.debtorArrested,
            nonInterferenceIssued: snapshot.nonInterferenceIssued,
            paidDebt: snapshot.paidDebt,
            paidCourtFees: snapshot.paidCourtFees,
            paidDirectorateFees: snapshot.paidDirectorateFees,
            paidClientFees: snapshot.paidClientFees,
            summoningRound: snapshot.summoningRound,
            voluntaryAttendanceCount: snapshot.voluntaryAttendanceCount,
            investigationCourtRequested: snapshot.investigationCourtRequested,
            investigationMemoIssued: snapshot.investigationMemoIssued,
            investigationPathDebtorPresent: snapshot.investigationPathDebtorPresent,
            forcedPathAttendanceSecured: snapshot.forcedPathAttendanceSecured,
            eviction_vacate_deadline: snapshot.evictionVacateDeadlineLocal,
            eviction_residential_grace_period_start: snapshot.evictionResidentialGracePeriodStart,
            eviction_executor_vacate_grant_approved: snapshot.evictionExecutorVacateGrantApproved,
            eviction_residential_grace_manually_ended_at: snapshot.evictionResidentialGraceManuallyEndedAt,
            eviction_assets_tab_unlocked: snapshot.evictionAssetsTabUnlocked,
            eviction_case_expenses: snapshot.evictionCaseExpenses,
            encroachment_case_expenses: snapshot.encroachmentCaseExpenses,
            specific_delivery_case_expenses: snapshot.specificDeliveryCaseExpenses,
            eviction_lawyer_fee_requested: base.eviction_lawyer_fee_requested,
            eviction_lawyer_fee_waived_at_intake: base.eviction_lawyer_fee_waived_at_intake,
            eviction_voluntary_period_end_declared: base.eviction_voluntary_period_end_declared,
            eviction_earner_fee_collection_sm: snapshot.earnerFeeCollectionSm,
            execution_memo_anchor_date: base.execution_memo_anchor_date,
            notice_voluntary_period_end_declared: base.notice_voluntary_period_end_declared,
        };

        storageCache.set(executionStorageKey(persistKey), updatedData);
    } catch (error) {
        debug.error('Failed to save execution data:', error);
    }
}

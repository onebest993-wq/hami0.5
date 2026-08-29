/** Earner-fee collection SM apply + notification-cycle reset */
import { useCallback } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
import {
    defaultEvictionEarnerFeeCollectionSM,
    reduceEvictionEarnerFeeSm,
    type EarnerFeeSmAction,
} from '@/app/utils/evictionEarnerFeeCollectionMachine';
import type { UseExecutionDashboardDebtorSummonsCoerciveHandlersParams } from './useExecutionDashboardDebtorSummonsCoerciveHandlers.types';

type EarnerFeeSmParams = Pick<
    UseExecutionDashboardDebtorSummonsCoerciveHandlersParams,
    | 'forcedSummoningAnalysis'
    | 'nextTimelineId'
    | 'persistExecutionMerge'
    | 'showToast'
    | 'setTimelineEvents'
    | 'setEarnerFeeCollectionSm'
    | 'setActiveNoticeState'
    | 'setForcedAttendanceIssued'
    | 'setInvestigationCourtRequested'
    | 'setInvestigationMemoIssued'
    | 'setInvestigationPathDebtorPresent'
    | 'setForcedPathAttendanceSecured'
    | 'setDebtorForcedToAttend'
    | 'setDebtorArrested'
    | 'setArrestWarrantUnlocked'
    | 'setDebtorEvaded'
> & {
    handleForcedAttendance: () => void;
    handleDebtorEvasion: () => void;
    handleRequestInvestigationFromForced: () => void;
    handleInvestigationIssueMemo: () => void;
};

export function useDebtorEarnerFeeSmHandlers({
    forcedSummoningAnalysis,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    setEarnerFeeCollectionSm,
    setActiveNoticeState,
    setForcedAttendanceIssued,
    setInvestigationCourtRequested,
    setInvestigationMemoIssued,
    setInvestigationPathDebtorPresent,
    setForcedPathAttendanceSecured,
    setDebtorForcedToAttend,
    setDebtorArrested,
    setArrestWarrantUnlocked,
    setDebtorEvaded,
    handleForcedAttendance,
    handleDebtorEvasion,
    handleRequestInvestigationFromForced,
    handleInvestigationIssueMemo,
}: EarnerFeeSmParams) {
    const applyEarnerFeeSmAction = useCallback(
        (action: EarnerFeeSmAction) => {
            if (action.type === 'B2_FORCED_MEMO' && !forcedSummoningAnalysis.canForceSummon) {
                showToast(
                    forcedSummoningAnalysis.lockReasonAr ||
                        'غير مسموح بالإحضار الجبري وفقاً للوضع القانوني الحالي.',
                    'warning',
                );
                return;
            }
            const side = {
                force: false,
                evasion: false,
                clearEvasion: false,
                b3: false,
                b4: false,
            };
            setEarnerFeeCollectionSm((prev) => {
                if (action.type === 'B1_PERIOD_DONE' && prev.b1PeriodComplete) return prev;
                if (action.type === 'B2_FORCED_MEMO' && prev.b2ForcedMemoIssued) return prev;
                if (action.type === 'B3_REQUEST' && prev.b3InvestigationRequested) return prev;
                if (action.type === 'B3_CONFIRM_PROCESSED' && prev.b3ProcessedConfirmed) return prev;
                if (action.type === 'B4_WARRANT' && prev.b4WarrantLogged) return prev;

                const next = reduceEvictionEarnerFeeSm(prev, action);
                const merge: Record<string, unknown> = { eviction_earner_fee_collection_sm: next };
                if (action.type === 'PICK_ORDINARY') {
                    merge.eviction_last_summons_for_collection = true;
                    merge.eviction_last_collection_summons_branch = 'ordinary';
                }
                if (action.type === 'PICK_COERCIVE') {
                    merge.eviction_last_summons_for_collection = true;
                    merge.eviction_last_collection_summons_branch = 'coercive';
                }
                persistExecutionMerge(merge);

                if (action.type === 'B2_FORCED_MEMO' && !prev.b2ForcedMemoIssued) side.force = true;
                if (action.type === 'B2_EVADING' && action.value && !prev.b2DebtorEvading) side.evasion = true;
                else if (action.type === 'B2_EVADING' && !action.value && prev.b2DebtorEvading)
                    side.clearEvasion = true;
                if (action.type === 'B3_REQUEST' && !prev.b3InvestigationRequested) side.b3 = true;
                if (action.type === 'B4_WARRANT' && !prev.b4WarrantLogged) side.b4 = true;

                return next;
            });
            if (side.force) handleForcedAttendance();
            if (side.evasion) handleDebtorEvasion();
            if (side.clearEvasion) {
                setDebtorEvaded(false);
                persistExecutionMerge({ debtorEvaded: false });
            }
            if (side.b3) handleRequestInvestigationFromForced();
            if (side.b4) handleInvestigationIssueMemo();
        },
        [
            forcedSummoningAnalysis,
            persistExecutionMerge,
            showToast,
            setEarnerFeeCollectionSm,
            handleForcedAttendance,
            handleDebtorEvasion,
            handleRequestInvestigationFromForced,
            handleInvestigationIssueMemo,
            setDebtorEvaded,
        ],
    );

    const resetEarnerFeeNotificationCycle = useCallback(() => {
        const fresh = defaultEvictionEarnerFeeCollectionSM();
        setEarnerFeeCollectionSm(fresh);
        setActiveNoticeState(null);
        setForcedAttendanceIssued(false);
        setInvestigationCourtRequested(false);
        setInvestigationMemoIssued(false);
        setInvestigationPathDebtorPresent(false);
        setForcedPathAttendanceSecured(false);
        setDebtorForcedToAttend(false);
        setDebtorArrested(false);
        setArrestWarrantUnlocked(false);
        setDebtorEvaded(false);
        persistExecutionMerge({
            eviction_earner_fee_collection_sm: fresh,
            eviction_last_summons_for_collection: false,
            eviction_last_collection_summons_branch: null,
            activeNoticeState: null,
            forcedAttendanceIssued: false,
            investigationCourtRequested: false,
            investigationMemoIssued: false,
            investigationPathDebtorPresent: false,
            forcedPathAttendanceSecured: false,
            debtorForcedToAttend: false,
            debtorArrested: false,
            arrestWarrantUnlocked: false,
            debtorEvaded: false,
        });
        const ev: TimelineEvent = {
            id: nextTimelineId(),
            date: new Date().toISOString(),
            timestamp: new Date().toISOString(),
            title: '🔄 إعادة ضبط مسار الاستحصال والتبليغ (كاسب — تخلية)',
            description: 'قُطع مسار الإكراه المرتبط بالاستحصال وأُعيدت آلية التبليغ لحالتها الأولية.',
            type: 'summons',
            source: 'التبليغ والإحضار',
        };
        setTimelineEvents((prev) => [ev, ...prev]);
        showToast('أُعيد ضبط مسار التبليغ والاستحصال — توقفت الإجراءات الإكراهية المعلّقة', 'info');
    }, [
        persistExecutionMerge,
        nextTimelineId,
        showToast,
        setEarnerFeeCollectionSm,
        setActiveNoticeState,
        setForcedAttendanceIssued,
        setInvestigationCourtRequested,
        setInvestigationMemoIssued,
        setInvestigationPathDebtorPresent,
        setForcedPathAttendanceSecured,
        setDebtorForcedToAttend,
        setDebtorArrested,
        setArrestWarrantUnlocked,
        setDebtorEvaded,
        setTimelineEvents,
    ]);

    return { applyEarnerFeeSmAction, resetEarnerFeeNotificationCycle };
}

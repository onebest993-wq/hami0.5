import { useMemo } from 'react';
import { addDaysYmd, maxYmd } from '../../utils/ymd';
import { cassationAdvisoryHint, resolveProcedureCategory } from '@/app/domain/urgent/procedureCategory';
import { computeGrievancePhase2FinalizeReady } from './grievanceFinalizeGates';
import type { UseOrderFileLifecycleDerivedArgs } from './types';

function pickYmd(value: unknown): string {
    const s = String(value ?? '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

type CassationDerivedDeps = {
    grievanceClosingHearingExists: boolean;
    grievanceExpiredCanClose: boolean;
    grievanceDecisionDateChronologyError: string | null;
};

export function useCassationDerived(args: UseOrderFileLifecycleDerivedArgs, deps: CassationDerivedDeps) {
    const {
        caseData,
        judgeDecision,
        grievanceData,
        grievanceDecision,
        cassationData,
        cassationDecision,
        hearings,
        hearingDraft,
        expertModule,
        phase2FirstHearingDate,
        grievanceLegalEndDate,
        setGrievanceLegalEndDate,
        grievanceTimingConfirmed,
        grievanceDetailsConfirmed,
        grievanceExpiredConfirmed,
        cassationExpiredConfirmed,
        editGrievance,
        requestDateYmd,
        todayYmdValue,
        hasIntervention,
        isFinalized,
        isFinalityNoGrievance,
        defenderPhase2ReadOnly,
        showGrievanceStep,
        isIqrarContext,
        partyLabel,
        computedGrievanceFiledBy,
        computedCassationFiledBy,
        showPreDecisionHearings,
    } = args;
    const { grievanceClosingHearingExists, grievanceExpiredCanClose, grievanceDecisionDateChronologyError } = deps;

    const procedureCategory = useMemo(
        () =>
            resolveProcedureCategory(
                (caseData as { procedureCategory?: string })?.procedureCategory,
                String(caseData?.specificActionType ?? ''),
            ),
        [caseData],
    );

    const cassationNotificationBaseYmd = useMemo(() => {
        if (showGrievanceStep) {
            return (
                pickYmd((caseData as { grievancePetitionNotificationDate?: string })?.grievancePetitionNotificationDate) ||
                pickYmd((caseData as { notificationDate?: string })?.notificationDate) ||
                pickYmd(grievanceDecision.decisionDate)
            );
        }
        return (
            pickYmd(grievanceData.rejectionNotificationDate) ||
            pickYmd((caseData as { rejectionNotificationDate?: string })?.rejectionNotificationDate) ||
            pickYmd((caseData as { notificationDate?: string })?.notificationDate)
        );
    }, [caseData, grievanceData.rejectionNotificationDate, grievanceDecision.decisionDate, showGrievanceStep]);

    const cassationPriorDecisionYmd = useMemo(() => {
        const base = showGrievanceStep
            ? String(grievanceDecision.decisionDate || '').trim()
            : String(judgeDecision.decisionDate || '').trim();
        return pickYmd(base);
    }, [grievanceDecision.decisionDate, judgeDecision.decisionDate, showGrievanceStep]);
const cassationFilingMinYmd = useMemo(
    () => maxYmd(cassationPriorDecisionYmd, requestDateYmd),
    [cassationPriorDecisionYmd, requestDateYmd],
);
const cassationFilingDateChronologyError = useMemo(() => {
    const f = String(cassationData.filingDate || '').trim();
    if (!f || !cassationFilingMinYmd) return null;
    if (f < cassationFilingMinYmd) return 'تاريخ تقديم الطعن يجب ألا يسبق قرار المرحلة السابقة أو تقديم الطلب الأصلي';
    return null;
}, [cassationData.filingDate, cassationFilingMinYmd]);
const cassationEnteredFilingYmd = useMemo(() => {
    const f = String(cassationData.filingDate || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : '';
}, [cassationData.filingDate]);
const cassationDecisionMinYmd = useMemo(
    () => maxYmd(cassationEnteredFilingYmd, cassationFilingMinYmd),
    [cassationEnteredFilingYmd, cassationFilingMinYmd],
);
const cassationDecisionDateError = useMemo(() => {
    const decision = String(cassationDecision.decisionDate || '').trim();
    const minD = cassationDecisionMinYmd;
    if (!decision || !minD) return null;
    if (decision < minD) return 'تاريخ قرار التمييز يجب أن يكون بعد/مساوٍ لتاريخ تقديم الطعن';
    return null;
}, [cassationDecision.decisionDate, cassationDecisionMinYmd]);
const cassationLegalEndDate = useMemo(() => {
    if (!cassationNotificationBaseYmd) return '';
    return addDaysYmd(cassationNotificationBaseYmd, 7);
}, [cassationNotificationBaseYmd]);

const cassationAdvisoryText = useMemo(
    () => cassationAdvisoryHint(procedureCategory),
    [procedureCategory],
);
const cassationExpiredCanClose = useMemo(() => {
    const end = String(cassationLegalEndDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
    return todayYmdValue > end;
}, [cassationLegalEndDate, todayYmdValue]);
const cassationFilingAfterDeadline = useMemo(() => {
    const filing = String(cassationData.filingDate || '').trim();
    const end = String(cassationLegalEndDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(filing) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
    return filing > end;
}, [cassationData.filingDate, cassationLegalEndDate]);
const cassationFilingDetailsComplete = useMemo(() => {
    if (cassationData.outcome !== 'filed') return false;
    return (
        !!String(cassationData.filingDate || '').trim() &&
        !!String(cassationData.fileNumber || '').trim() &&
        !!computedCassationFiledBy
    );
}, [cassationData.fileNumber, cassationData.filingDate, cassationData.outcome, computedCassationFiledBy]);
const showCassationDecisionPanel = useMemo(() => {
    if (cassationData.outcome !== 'filed') return false;
    if (caseData?.cassationOutcome === 'filed') return true;
    return cassationFilingDetailsComplete;
}, [caseData?.cassationOutcome, cassationData.outcome, cassationFilingDetailsComplete]);
const grievanceFinalSaveReady = useMemo(() => {
    if (isFinalized) return false;
    if (grievanceData.outcome !== 'filed') return false;
    if (!grievanceDecision.decision) return false;
    if (!String(grievanceDecision.decisionDate || '').trim()) return false;
    if (!!grievanceDecisionDateChronologyError) return false;
    if (!grievanceClosingHearingExists) return false;
    return true;
}, [
    grievanceClosingHearingExists,
    grievanceData.outcome,
    grievanceDecision.decision,
    grievanceDecision.decisionDate,
    grievanceDecisionDateChronologyError,
    isFinalized,
]);
const grievancePhase2FinalizeReady = useMemo(
    () =>
        computeGrievancePhase2FinalizeReady({
            isFinalized,
            grievanceOutcome: grievanceData.outcome,
            grievanceExpiredCanClose,
            grievanceExpiredConfirmed,
            grievanceFinalSaveReady,
        }),
    [
        grievanceData.outcome,
        grievanceExpiredCanClose,
        grievanceExpiredConfirmed,
        grievanceFinalSaveReady,
        isFinalized,
    ],
);
const cassationPhaseFinalizeReady = useMemo(() => {
    if (isFinalized) return false;
    if (!cassationData.outcome) return false;
    if (cassationData.outcome === 'expired') {
        return cassationExpiredCanClose && cassationExpiredConfirmed;
    }
    if (cassationData.outcome === 'filed') {
        if (!cassationFilingDetailsComplete) return false;
        if (!!cassationFilingDateChronologyError) return false;
        if (!cassationDecision.decision) return false;
        if (!String(cassationDecision.decisionDate || '').trim()) return false;
        if (cassationDecisionDateError) return false;
        return true;
    }
    return false;
}, [
    cassationData.outcome,
    cassationDecision.decision,
    cassationDecision.decisionDate,
    cassationDecisionDateError,
    cassationExpiredCanClose,
    cassationExpiredConfirmed,
    cassationFilingDateChronologyError,
    cassationFilingDetailsComplete,
    isFinalized,
]);

    return {
        cassationFilingMinYmd,
        cassationFilingDateChronologyError,
        cassationDecisionMinYmd,
        cassationDecisionDateError,
        cassationLegalEndDate,
        cassationNotificationBaseYmd,
        cassationAdvisoryText,
        cassationExpiredCanClose,
        cassationFilingAfterDeadline,
        cassationFilingDetailsComplete,
        showCassationDecisionPanel,
        grievancePhase2FinalizeReady,
        cassationPhaseFinalizeReady,
    };
}

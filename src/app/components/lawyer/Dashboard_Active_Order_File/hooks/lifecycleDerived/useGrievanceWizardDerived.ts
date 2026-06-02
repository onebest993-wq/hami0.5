import { useEffect, useMemo } from 'react';
import { formatDateText } from '../../utils/formatters';
import { maxYmd } from '../../utils/ymd';
import type { UseOrderFileLifecycleDerivedArgs } from './types';

export type GrievancePhase = { effectiveJudgeDecision: string | null; effectiveJudgeDecisionDate: string; effectiveRejectionNotificationDate: string; judgePhaseComplete: boolean; showGrievanceLifecycle: boolean };

export function useGrievanceWizardDerived(args: UseOrderFileLifecycleDerivedArgs, phase: GrievancePhase) {
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
    const { effectiveJudgeDecision, effectiveJudgeDecisionDate, effectiveRejectionNotificationDate, judgePhaseComplete, showGrievanceLifecycle } = phase;

    const grievanceLegalEndMinYmd = useMemo(() => {
    const jd = String(effectiveJudgeDecisionDate || '').trim();
    const jdY = /^\d{4}-\d{2}-\d{2}$/.test(jd) ? jd : '';
    if (!hasIntervention) {
        const n = String(effectiveRejectionNotificationDate || '').trim();
        const nY = /^\d{4}-\d{2}-\d{2}$/.test(n) ? n : '';
        return maxYmd(maxYmd(requestDateYmd, jdY), nY);
    }
    return maxYmd(requestDateYmd, jdY);
}, [
    effectiveJudgeDecisionDate,
    effectiveRejectionNotificationDate,
    hasIntervention,
    requestDateYmd,
]);
const grievanceLegalEndDateChronologyError = useMemo(() => {
    const end = String(grievanceLegalEndDate || '').trim();
    const minD = grievanceLegalEndMinYmd;
    if (!end || !minD) return null;
    if (end < minD) return '⚠️ تاريخ انتهاء المدة يجب ألا يسبق التبليغ أو تاريخ القرار أو تقديم الطلب';
    return null;
}, [grievanceLegalEndDate, grievanceLegalEndMinYmd]);
const grievanceTimingGateReady = useMemo(() => {
    if (!judgeDecision.decision) return false;
    const end = String(grievanceLegalEndDate || '').trim();
    if (!end) return false;
    if (grievanceLegalEndDateChronologyError) return false;
    if (hasIntervention) return true;
    return !!effectiveRejectionNotificationDate;
}, [
    effectiveRejectionNotificationDate,
    grievanceLegalEndDate,
    grievanceLegalEndDateChronologyError,
    hasIntervention,
    judgeDecision.decision,
]);
/** قفل نهائي — لا يُقفل مسار الجلسات لمجرد تسجيل outcome=filed قبل قرار قاضي التظلم */
const grievanceWizardLocked = useMemo(() => {
    if (isFinalized) return true;
    if (!editGrievance && !!caseData?.grievanceDecision) return true;
    if (!editGrievance && caseData?.grievanceOutcome === 'expired') return true;
    return false;
}, [caseData?.grievanceDecision, caseData?.grievanceOutcome, editGrievance, isFinalized]);
const grievanceAllowDecisionEntry = useMemo(() => {
    return caseData?.grievanceOutcome === 'filed' && !caseData?.grievanceDecision;
}, [caseData?.grievanceDecision, caseData?.grievanceOutcome]);
const grievanceWizardInputsLocked = useMemo(() => {
    return grievanceWizardLocked && !grievanceAllowDecisionEntry;
}, [grievanceAllowDecisionEntry, grievanceWizardLocked]);
const grievanceDecisionLocked = useMemo(() => {
    if (!grievanceTimingConfirmed) return false;
    if (grievanceData.outcome === 'expired') return true;
    if (grievanceData.outcome === 'filed' && grievanceDetailsConfirmed) return true;
    return false;
}, [grievanceData.outcome, grievanceDetailsConfirmed, grievanceTimingConfirmed]);
const grievanceInHearings = useMemo(() => {
    return grievanceTimingConfirmed && grievanceData.outcome === 'filed' && grievanceDetailsConfirmed;
}, [grievanceData.outcome, grievanceDetailsConfirmed, grievanceTimingConfirmed]);
const grievanceLockedSummaryText = useMemo(() => {
    if (!grievanceDecisionLocked) return '';
    const tokens: string[] = [];
    if (!hasIntervention) {
        tokens.push(`📌 التبليغ: ${formatDateText(grievanceData.rejectionNotificationDate) || '—'}`);
    }
    tokens.push(`الانتهاء: ${formatDateText(grievanceLegalEndDate) || '—'}`);
    if (grievanceData.outcome === 'expired') {
        tokens.push('التظلم: لا');
    } else if (grievanceData.outcome === 'filed') {
        const who = partyLabel(computedGrievanceFiledBy);
        const when = formatDateText(grievanceData.filingDate) || '—';
        tokens.push(`التظلم: نعم (${who} في ${when})`);
    }
    return tokens.join(' | ');
}, [
    computedGrievanceFiledBy,
    grievanceData.filingDate,
    grievanceData.outcome,
    grievanceData.rejectionNotificationDate,
    grievanceDecisionLocked,
    grievanceLegalEndDate,
    hasIntervention,
    partyLabel,
]);
const grievanceExpiredCanClose = useMemo(() => {
    const end = String(grievanceLegalEndDate || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
    return todayYmdValue > end;
}, [grievanceLegalEndDate, todayYmdValue]);

    const grievanceProceedingsClosed = useMemo(() => {
    const tokens = ['ختام المرافعة', 'ختام وتعيين يوم للقرار', 'ختام المرافعة وتحديد موعد القرار'];
    const latest = hearings
        .filter((h) => h.stage === 'grievance')
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
    if (!latest) return false;
    const notes = String(latest.notes || '');
    return tokens.some((t) => notes.includes(t));
}, [hearings]);
const grievanceOutcomeSelected =
    grievanceData.outcome === 'filed' || grievanceData.outcome === 'expired';
const showGrievanceTimingForm = !grievanceTimingConfirmed;
const showGrievanceTimingSummary = grievanceTimingConfirmed;
const showGrievanceOutcomeForm = grievanceTimingConfirmed && !grievanceOutcomeSelected;
const showGrievanceOutcomeSummary = grievanceTimingConfirmed && grievanceOutcomeSelected;
const showGrievanceDetailsForm =
    grievanceTimingConfirmed && grievanceData.outcome === 'filed' && !grievanceDetailsConfirmed;
const showGrievanceDetailsSummary =
    grievanceTimingConfirmed && grievanceData.outcome === 'filed' && grievanceDetailsConfirmed;
const showGrievanceDecisionForm = grievanceInHearings && grievanceProceedingsClosed;
const showGrievanceFinalizeButton = useMemo(() => {
    if (isFinalized || defenderPhase2ReadOnly) return false;
    if (!!caseData?.grievanceDecision) return false;
    if (caseData?.grievanceOutcome === 'expired' && (caseData?.status === 'completed' || caseData?.phase === 'completed')) {
        return false;
    }
    return true;
}, [
    caseData?.grievanceDecision,
    caseData?.grievanceOutcome,
    caseData?.phase,
    caseData?.status,
    defenderPhase2ReadOnly,
    isFinalized,
]);

    return {
        grievanceLegalEndMinYmd,
        grievanceLegalEndDateChronologyError,
        grievanceTimingGateReady,
        grievanceWizardInputsLocked,
        grievanceInHearings,
        grievanceLockedSummaryText,
        grievanceExpiredCanClose,
        grievanceProceedingsClosed,
        showGrievanceTimingForm,
        showGrievanceTimingSummary,
        showGrievanceOutcomeForm,
        showGrievanceOutcomeSummary,
        showGrievanceDetailsForm,
        showGrievanceDetailsSummary,
        showGrievanceDecisionForm,
        showGrievanceFinalizeButton,
    };
}

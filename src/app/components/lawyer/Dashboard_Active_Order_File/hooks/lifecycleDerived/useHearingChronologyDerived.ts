import { useEffect, useMemo } from 'react';
import { getActiveDate } from '@/app/utils/hearingDates';
import {
    isAdjournReasonValid,
    isGrievancePleadingClosedSession,
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from '../../utils/hearingRules';
import { maxYmd } from '../../utils/ymd';
import type { UseOrderFileLifecycleDerivedArgs } from './types';

export type ChronologyPhase = { effectiveJudgeDecisionDate: string };

export function useHearingChronologyDerived(args: UseOrderFileLifecycleDerivedArgs, phase: ChronologyPhase) {
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
    const { effectiveJudgeDecisionDate } = phase;

    const intakeFirstHearingDate = useMemo(() => {
    return String((caseData as any)?.firstHearingDate ?? '')
        .trim()
        .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
}, [(caseData as any)?.firstHearingDate]);

const phase1Sessions = useMemo(() => hearings.filter((h) => h.stage === 'pre_decision'), [hearings]);
const phase2Sessions = useMemo(() => hearings.filter((h) => h.stage === 'grievance'), [hearings]);
const phase1ActiveDate = useMemo(
    () => getActiveDate(phase1Sessions, intakeFirstHearingDate),
    [phase1Sessions, intakeFirstHearingDate],
);
const phase2ActiveDate = useMemo(
    () => getActiveDate(phase2Sessions, phase2FirstHearingDate),
    [phase2Sessions, phase2FirstHearingDate],
);
const grievanceFirstHearingAnchorYmd = useMemo(() => {
    return String((caseData as any)?.grievanceFirstHearingDate ?? phase2FirstHearingDate ?? '')
        .trim()
        .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
}, [(caseData as any)?.grievanceFirstHearingDate, phase2FirstHearingDate]);
const showGrievancePhase2AdjournBanner = useMemo(() => {
    return (
        phase2Sessions.length > 0 &&
        !!String(phase2ActiveDate || '').trim() &&
        !!grievanceFirstHearingAnchorYmd &&
        String(phase2ActiveDate) !== grievanceFirstHearingAnchorYmd
    );
}, [grievanceFirstHearingAnchorYmd, phase2ActiveDate, phase2Sessions.length]);
const grievanceHearingsSorted = useMemo(() => {
    return [...phase2Sessions].sort((a, b) => String(a.sessionDate || '').localeCompare(String(b.sessionDate || '')));
}, [phase2Sessions]);

const phase1PleadingClosedLatestSessionYmd = useMemo(() => {
    let best = '';
    for (const h of phase1Sessions) {
        const notes = String(h.notes || '');
        if (isPreDecisionNullifyNotes(notes)) continue;
        if (!isPreDecisionCloseNotes(notes)) continue;
        const d = String(h.sessionDate || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        if (!best || d > best) best = d;
    }
    return best;
}, [phase1Sessions]);

const phase1ChronologicalSessionMaxYmd = useMemo(() => {
    let best = '';
    for (const h of phase1Sessions) {
        const d = String(h.sessionDate || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        if (!best || d > best) best = d;
    }
    return best;
}, [phase1Sessions]);

const phase1NewSessionMinYmd = useMemo(
    () => maxYmd(maxYmd(requestDateYmd, intakeFirstHearingDate), phase1ChronologicalSessionMaxYmd),
    [requestDateYmd, intakeFirstHearingDate, phase1ChronologicalSessionMaxYmd],
);

const phase1JudgeDecisionMinYmd = useMemo(
    () => phase1PleadingClosedLatestSessionYmd || requestDateYmd || '',
    [phase1PleadingClosedLatestSessionYmd, requestDateYmd],
);

const phase2PleadingClosedLatestSessionYmd = useMemo(() => {
    let best = '';
    for (const h of phase2Sessions) {
        if (!isGrievancePleadingClosedSession(h)) continue;
        const d = String(h.sessionDate || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        if (!best || d > best) best = d;
    }
    return best;
}, [phase2Sessions]);

const phase2ChronologicalSessionMaxYmd = useMemo(() => {
    let best = '';
    for (const h of phase2Sessions) {
        const d = String(h.sessionDate || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
        if (!best || d > best) best = d;
    }
    return best;
}, [phase2Sessions]);

const grievanceFilingYmd = useMemo(() => {
    const d = String(grievanceData.filingDate || '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : '';
}, [grievanceData.filingDate]);

const phase2NewSessionMinYmd = useMemo(
    () => maxYmd(maxYmd(grievanceFilingYmd, grievanceFirstHearingAnchorYmd), phase2ChronologicalSessionMaxYmd),
    [grievanceFilingYmd, grievanceFirstHearingAnchorYmd, phase2ChronologicalSessionMaxYmd],
);

const grievanceFilingMinYmd = useMemo(() => {
    const jd = String(effectiveJudgeDecisionDate || '').trim();
    const jdY = /^\d{4}-\d{2}-\d{2}$/.test(jd) ? jd : '';
    return jdY || requestDateYmd;
}, [effectiveJudgeDecisionDate, requestDateYmd]);

const grievanceFirstHearingMinYmd = useMemo(
    () => maxYmd(grievanceFilingYmd, grievanceFilingMinYmd),
    [grievanceFilingMinYmd, grievanceFilingYmd],
);

const grievanceDecisionMinYmd = useMemo(
    () => maxYmd(maxYmd(phase2PleadingClosedLatestSessionYmd, grievanceFilingYmd), grievanceFilingMinYmd),
    [grievanceFilingMinYmd, grievanceFilingYmd, phase2PleadingClosedLatestSessionYmd],
);

const judgeDecisionDateChronologyError = useMemo(() => {
    const d = String(judgeDecision.decisionDate || '').trim();
    const minD = phase1JudgeDecisionMinYmd;
    if (!d || !minD) return null;
    if (d < minD) return '⚠️ تاريخ القرار يجب ألا يسبق ختام المرافعة أو تاريخ تقديم الطلب';
    return null;
}, [judgeDecision.decisionDate, phase1JudgeDecisionMinYmd]);

const grievanceFilingDateChronologyError = useMemo(() => {
    const f = grievanceFilingYmd;
    const minD = grievanceFilingMinYmd;
    if (!f || !minD) return null;
    if (f < minD) return '⚠️ تاريخ التظلم يجب ألا يسبق تاريخ قرار المرحلة الأولى';
    return null;
}, [grievanceFilingMinYmd, grievanceFilingYmd]);

const grievanceFirstHearingDateChronologyError = useMemo(() => {
    const p2 = grievanceFirstHearingAnchorYmd;
    const minD = grievanceFirstHearingMinYmd;
    if (!p2 || !minD) return null;
    if (p2 < minD) return '⚠️ تاريخ جلسة التظلم الأولى يجب ألا يسبق تاريخ التظلم أو القرار';
    return null;
}, [grievanceFirstHearingAnchorYmd, grievanceFirstHearingMinYmd]);

const grievanceDecisionDateChronologyError = useMemo(() => {
    const d = String(grievanceDecision.decisionDate || '').trim();
    const minD = grievanceDecisionMinYmd;
    if (!d || !minD) return null;
    if (d < minD) return '⚠️ تاريخ قرار التظلم يجب ألا يسبق ختام المرافعة أو تاريخ التظلم';
    return null;
}, [grievanceDecision.decisionDate, grievanceDecisionMinYmd]);

const decisionNotificationQuickLogMinYmd = useMemo(() => {
    const jd = String(effectiveJudgeDecisionDate || '').trim();
    const jdY = /^\d{4}-\d{2}-\d{2}$/.test(jd) ? jd : '';
    return maxYmd(requestDateYmd, jdY);
}, [effectiveJudgeDecisionDate, requestDateYmd]);

const grievanceClosingHearingExists = useMemo(() => {
    const tokens = ['ختام المرافعة', 'ختام وتعيين يوم للقرار', 'ختام المرافعة وتحديد موعد القرار'];
    return hearings.some((h) => {
        if (h.stage !== 'grievance') return false;
        const notes = String(h.notes || '');
        if (isPreDecisionNullifyNotes(notes)) return false;
        if (tokens.some((t) => notes.includes(t))) return true;
        return !String(h.nextSessionDate || '').trim();
    });
}, [hearings]);
const hearingDraftSessionDateError = useMemo(() => {
    const stage = hearingDraft.stage;
    const session = String(hearingDraft.sessionDate || '').trim();
    if (!session) return null;
    if (stage === 'pre_decision') {
        const minS = phase1NewSessionMinYmd;
        if (minS && session < minS) return '⚠️ تاريخ الجلسة يجب أن يكون بعد/مساوٍ لآخر تاريخ في المسار (تقديم الطلب / جلسات سابقة)';
    }
    if (stage === 'grievance') {
        const minS = phase2NewSessionMinYmd;
        if (minS && session < minS) return '⚠️ تاريخ الجلسة يجب أن يكون بعد/مساوٍ لتاريخ التظلم وجلسة التظلم الأولى والجلسات السابقة';
        const filing = String(grievanceData.filingDate || '').trim();
        if (filing && session < filing) return '⚠️ تاريخ الجلسة يجب أن يكون بعد/مساوٍ لتاريخ تقديم التظلم';
    }
    return null;
}, [
    grievanceData.filingDate,
    hearingDraft.sessionDate,
    hearingDraft.stage,
    phase1NewSessionMinYmd,
    phase2NewSessionMinYmd,
]);
const hearingDraftNextSessionDateError = useMemo(() => {
    if (hearingDraft.outcome !== 'adjourn') return null;
    const session = String(hearingDraft.sessionDate || '').trim();
    const next = String(hearingDraft.nextSessionDate || '').trim();
    if (!session || !next) return null;
    if (next < session) return '⚠️ موعد الجلسة القادمة يجب أن يكون بعد/مساوٍ لتاريخ الجلسة';
    return null;
}, [hearingDraft.nextSessionDate, hearingDraft.outcome, hearingDraft.sessionDate]);
const hearingDraftAdjournReasonError = useMemo(() => {
    if (hearingDraft.outcome !== 'adjourn') return null;
    const notes = String(hearingDraft.notes || '').trim();
    if (!notes) return null;
    if (!isAdjournReasonValid(notes)) return 'سبب التأجيل يجب أن يحتوي على نص وليس أرقاماً فقط';
    return null;
}, [hearingDraft.notes, hearingDraft.outcome]);

    return {
        intakeFirstHearingDate,
        phase1Sessions,
        phase1ActiveDate,
        phase2ActiveDate,
        grievanceFirstHearingAnchorYmd,
        showGrievancePhase2AdjournBanner,
        grievanceHearingsSorted,
        phase1NewSessionMinYmd,
        phase1JudgeDecisionMinYmd,
        phase2NewSessionMinYmd,
        grievanceFilingMinYmd,
        grievanceFirstHearingMinYmd,
        grievanceDecisionMinYmd,
        judgeDecisionDateChronologyError,
        grievanceFilingDateChronologyError,
        grievanceFirstHearingDateChronologyError,
        grievanceDecisionDateChronologyError,
        decisionNotificationQuickLogMinYmd,
        grievanceClosingHearingExists,
        hearingDraftSessionDateError,
        hearingDraftNextSessionDateError,
        hearingDraftAdjournReasonError,
    };
}

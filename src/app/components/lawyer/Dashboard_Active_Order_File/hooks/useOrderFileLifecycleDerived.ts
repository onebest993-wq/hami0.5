import { useEffect, useMemo } from 'react';
import { getActiveDate } from '@/app/utils/hearingDates';
import {
    getPreDecisionHearingOutcome,
    getPreDecisionSessionOutcome,
    isAdjournReasonValid,
    isGrievancePleadingClosedSession,
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from '../utils/hearingRules';
import {
    PRE_DECISION_OUTCOME_ADJOURN,
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from '../constants/hearingOutcomes';
import { formatDateText } from '../utils/formatters';
import { addDaysYmd, maxYmd } from '../utils/ymd';
import type {
    CaseHearing,
    CassationData,
    CassationDecision,
    ExpertModule,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
    PreDecisionHearingOutcomeKind,
} from '../types';

export type UseOrderFileLifecycleDerivedArgs = {
    caseData: any;
    judgeDecision: JudgeDecision;
    grievanceData: GrievanceData;
    grievanceDecision: GrievanceDecision;
    cassationData: CassationData;
    cassationDecision: CassationDecision;
    hearings: CaseHearing[];
    hearingDraft: {
        open: boolean;
        stage: import('../types').HearingStage;
        outcome: 'adjourn' | 'close' | 'terminate';
        sessionDate: string;
        notes: string;
        nextSessionDate: string;
        decisionDate: string;
    };
    expertModule: ExpertModule;
    phase2FirstHearingDate: string;
    grievanceLegalEndDate: string;
    setGrievanceLegalEndDate: React.Dispatch<React.SetStateAction<string>>;
    grievanceTimingConfirmed: boolean;
    grievanceDetailsConfirmed: boolean;
    grievanceExpiredConfirmed: boolean;
    cassationExpiredConfirmed: boolean;
    editGrievance: boolean;
    requestDateYmd: string;
    todayYmdValue: string;
    hasIntervention: boolean;
    isFinalized: boolean;
    isFinalityNoGrievance: boolean;
    defenderPhase2ReadOnly: boolean;
    showGrievanceStep: boolean;
    isIqrarContext: boolean;
    partyLabel: (role: 'client' | 'opponent' | null) => string;
    computedGrievanceFiledBy: 'client' | 'opponent' | null;
    computedCassationFiledBy: 'client' | 'opponent' | null;
    showPreDecisionHearings: boolean;
};

export function useOrderFileLifecycleDerived(args: UseOrderFileLifecycleDerivedArgs) {
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

    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const daysDiff = (from: Date, to: Date) => {
        const msPerDay = 24 * 60 * 60 * 1000;
        return Math.round((dayStart(to).getTime() - dayStart(from).getTime()) / msPerDay);
    };

    useEffect(() => {
        if (grievanceTimingConfirmed) return;
        const base = String(
            grievanceData.rejectionNotificationDate || (caseData as any)?.notificationDate || '',
        ).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return;
        if (String(grievanceLegalEndDate || '').trim()) return;
        const end = addDaysYmd(base, 3);
        if (end) setGrievanceLegalEndDate(end);
    }, [
        caseData,
        grievanceData.rejectionNotificationDate,
        grievanceLegalEndDate,
        grievanceTimingConfirmed,
        setGrievanceLegalEndDate,
    ]);

    const effectiveJudgeDecision = judgeDecision.decision ?? (caseData as any)?.judgeDecision ?? null;
    const effectiveJudgeDecisionDate = String(judgeDecision.decisionDate || (caseData as any)?.judgeDecisionDate || '').trim();
    const defenderStateOrderSummaryDate = useMemo(() => {
        const s = String((caseData as any)?.stateOrderIssuedDate || '').trim();
        return s.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
    }, [(caseData as any)?.stateOrderIssuedDate]);
    const judgePhaseComplete = !!effectiveJudgeDecision && !!effectiveJudgeDecisionDate;
    const showGrievanceLifecycle =
        showGrievanceStep &&
        (judgePhaseComplete || isFinalized) &&
        (effectiveJudgeDecision === 'rejected' ||
            effectiveJudgeDecision === 'accepted' ||
            effectiveJudgeDecision === 'partially_accepted' ||
            !!caseData?.grievanceOutcome ||
            !!caseData?.grievanceDecision ||
            isFinalityNoGrievance);
    const showCassationLifecycle = useMemo(() => {
        if (isIqrarContext) return false;
        if (!showGrievanceStep) {
            return (
                judgePhaseComplete ||
                !!caseData?.cassationOutcome ||
                !!caseData?.cassationDecision ||
                isFinalized
            );
        }
        const grievanceReached =
            !!caseData?.grievanceOutcome ||
            !!caseData?.grievanceDecision ||
            isFinalityNoGrievance ||
            (isFinalized && effectiveJudgeDecision === 'rejected') ||
            (isFinalized &&
                (effectiveJudgeDecision === 'accepted' || effectiveJudgeDecision === 'partially_accepted'));
        const cassationReached =
            !!caseData?.cassationOutcome ||
            !!caseData?.cassationDecision ||
            (caseData as any)?.legalState === 'Awaiting_Cassation' ||
            isFinalized;
        return grievanceReached && cassationReached;
    }, [
        caseData,
        effectiveJudgeDecision,
        isFinalityNoGrievance,
        isFinalized,
        judgePhaseComplete,
        showGrievanceStep,
        isIqrarContext,
    ]);
    const effectiveRejectionNotificationDate = useMemo(() => {
        return String(grievanceData.rejectionNotificationDate || (caseData as any)?.notificationDate || '').trim();
    }, [caseData, grievanceData.rejectionNotificationDate]);
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
    const nextHearingDate = useMemo(() => {
        const candidates = hearings
            .map((h) => String(h.nextSessionDate || '').trim())
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= todayYmdValue)
            .sort((a, b) => a.localeCompare(b));
        return candidates[0] ?? '';
    }, [hearings, todayYmdValue]);
    const reportDueSoon = useMemo(() => {
        if (!expertModule.enabled) return false;
        if (!expertModule.reportDueDate) return false;
        if (expertModule.reportReceivedDate) return false;
        const due = new Date(expertModule.reportDueDate);
        if (Number.isNaN(due.getTime())) return false;
        const days = daysDiff(new Date(), due);
        return days >= 0 && days <= 3;
    }, [daysDiff, expertModule.enabled, expertModule.reportDueDate, expertModule.reportReceivedDate]);
    const preDecisionProceedingsClosed = useMemo(() => {
        const tokens = ['ختام المرافعة', 'ختام وتعيين يوم للقرار', 'ختام المرافعة وتحديد موعد القرار'];
        const latest = hearings
            .filter((h) => h.stage === 'pre_decision')
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
        if (!latest) return false;
        const notes = String(latest.notes || '');
        return tokens.some((t) => notes.includes(t));
    }, [hearings]);
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
    const preDecisionHearingsSorted = useMemo(() => {
        return [...hearings]
            .filter((h) => h.stage === 'pre_decision')
            .sort((a, b) => String(a.sessionDate || '').localeCompare(String(b.sessionDate || '')));
    }, [hearings]);
    /** جلسات ما قبل القرار — index 0 = الأحدث (createdAt) */
    const sessions = useMemo(
        () =>
            [...preDecisionHearingsSorted]
                .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
                .map((session) => ({
                    ...session,
                    outcome: getPreDecisionSessionOutcome(String(session.notes || ''), session.nextSessionDate),
                })),
        [preDecisionHearingsSorted],
    );
    const hasSessions = sessions.length > 0;
    const latestOutcome = hasSessions ? sessions[0].outcome : null;
    const isAdjourned = latestOutcome === PRE_DECISION_OUTCOME_ADJOURN;
    const isConcluded = latestOutcome === PRE_DECISION_OUTCOME_CLOSE;
    const isNullified = latestOutcome === PRE_DECISION_OUTCOME_NULLIFY;
    const isCaseTerminated = isConcluded || isNullified;
    const preDecisionTerminalKind = useMemo((): 'close' | 'nullify' | null => {
        if (!isCaseTerminated) return null;
        if (isNullified) return 'nullify';
        if (isConcluded) return 'close';
        return null;
    }, [isCaseTerminated, isConcluded, isNullified]);
    const preDecisionSessionCount = sessions.length;
    const latestPreDecisionHearing = useMemo(() => {
        return [...hearings]
            .filter((h) => h.stage === 'pre_decision')
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0] ?? null;
    }, [hearings]);
    const latestPreDecisionOutcome = useMemo((): PreDecisionHearingOutcomeKind | 'none' => {
        if (!latestPreDecisionHearing) return 'none';
        return getPreDecisionHearingOutcome(latestPreDecisionHearing);
    }, [latestPreDecisionHearing]);
    const isPreDecisionSessionModalOpen =
        hearingDraft.open && hearingDraft.stage === 'pre_decision' && !isCaseTerminated;
    /** بلا سجل جلسات (مسار غيابي خالص): قرار مباشر. مع سجل الجلسات: القرار فقط بعد ختام المرافعة أو إبطال — لا يُعرض مع الجلسات */
    const showDecisionAtTop =
        !showPreDecisionHearings && !hasSessions && !isPreDecisionSessionModalOpen;
    const showDecisionAtBottom =
        showPreDecisionHearings &&
        hasSessions &&
        (isConcluded || isNullified) &&
        !isPreDecisionSessionModalOpen;
    /** مسار الجلسات: القرار أسفل السجل فقط بعد ختام/إبطال. مسار بلا جلسات: قرار مباشر */
    const showJudgeDecisionBlock = showPreDecisionHearings ? showDecisionAtBottom : showDecisionAtTop;
    const showJudgeDecisionTerminateOnly = isNullified;
    const showJudgeDecisionFullForm = showJudgeDecisionBlock && (showDecisionAtTop || isConcluded);
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
    const archiveSummaryText = useMemo(() => {
        if (!isFinalized) return '';
        const reason = String((caseData as any)?.finalityReason || (caseData as any)?.archivedReason || '').trim();
        if (reason === 'terminated_request') return 'إبطال الطلب وإغلاق الإضبارة';
        if (reason === 'iqrar_authenticated') return 'إقرار مؤرشف — تم إصدار حجة الإقرار والمصادقة';
        if (reason === 'cassation_decision') return 'انتهاء مرحلة التمييز وصدور القرار';
        if (reason === 'expired') return 'انقضاء المدة القانونية دون إجراء';
        if (reason === 'no_grievance') return 'اكتساب الدرجة القطعية دون تظلم';
        return 'إنهاء الإضبارة وأرشفتها';
    }, [caseData, isFinalized]);
    const cassationBaseDate = showGrievanceStep ? grievanceDecision.decisionDate : judgeDecision.decisionDate;
    const cassationPriorDecisionYmd = useMemo(() => {
        const base = String(cassationBaseDate || '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(base) ? base : '';
    }, [cassationBaseDate]);
    const cassationFilingMinYmd = useMemo(
        () => maxYmd(cassationPriorDecisionYmd, requestDateYmd),
        [cassationPriorDecisionYmd, requestDateYmd],
    );
    const cassationFilingDateChronologyError = useMemo(() => {
        const f = String(cassationData.filingDate || '').trim();
        if (!f || !cassationFilingMinYmd) return null;
        if (f < cassationFilingMinYmd) return '⚠️ تاريخ تقديم الطعن يجب ألا يسبق قرار المرحلة السابقة أو تقديم الطلب الأصلي';
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
        if (decision < minD) return '⚠️ تاريخ قرار التمييز يجب أن يكون بعد/مساوٍ لتاريخ تقديم الطعن';
        return null;
    }, [cassationDecision.decisionDate, cassationDecisionMinYmd]);
    const cassationLegalEndDate = useMemo(() => {
        const base = String(cassationBaseDate || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(base)) return '';
        return addDaysYmd(base, 7);
    }, [cassationBaseDate]);
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
    const grievancePhase2FinalizeReady = useMemo(() => {
        if (isFinalized) return false;
        if (grievanceData.outcome === 'expired') {
            if (!grievanceExpiredCanClose) return false;
            return grievanceExpiredConfirmed;
        }
        if (grievanceData.outcome === 'filed') {
            if (!grievanceFinalSaveReady) return false;
            return true;
        }
        return false;
    }, [
        grievanceData.outcome,
        grievanceExpiredCanClose,
        grievanceExpiredConfirmed,
        grievanceFinalSaveReady,
        isFinalized,
    ]);
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
        effectiveJudgeDecision,
        effectiveJudgeDecisionDate,
        defenderStateOrderSummaryDate,
        judgePhaseComplete,
        showGrievanceLifecycle,
        showCassationLifecycle,
        effectiveRejectionNotificationDate,
        grievanceLegalEndMinYmd,
        grievanceLegalEndDateChronologyError,
        grievanceTimingGateReady,
        grievanceWizardLocked,
        grievanceWizardInputsLocked,
        grievanceInHearings,
        grievanceLockedSummaryText,
        grievanceExpiredCanClose,
        nextHearingDate,
        reportDueSoon,
        grievanceProceedingsClosed,
        showGrievanceTimingForm,
        showGrievanceTimingSummary,
        showGrievanceOutcomeForm,
        showGrievanceOutcomeSummary,
        showGrievanceDetailsForm,
        showGrievanceDetailsSummary,
        showGrievanceDecisionForm,
        showGrievanceFinalizeButton,
        preDecisionHearingsSorted,
        hasSessions,
        latestOutcome,
        isAdjourned,
        phase1Sessions,
        isCaseTerminated,
        preDecisionTerminalKind,
        showJudgeDecisionBlock,
        showJudgeDecisionTerminateOnly,
        showJudgeDecisionFullForm,
        intakeFirstHearingDate,
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
        archiveSummaryText,
        cassationFilingMinYmd,
        cassationFilingDateChronologyError,
        cassationDecisionMinYmd,
        cassationDecisionDateError,
        cassationLegalEndDate,
        cassationExpiredCanClose,
        cassationFilingAfterDeadline,
        cassationFilingDetailsComplete,
        showCassationDecisionPanel,
        grievanceFinalSaveReady,
        grievancePhase2FinalizeReady,
        cassationPhaseFinalizeReady,

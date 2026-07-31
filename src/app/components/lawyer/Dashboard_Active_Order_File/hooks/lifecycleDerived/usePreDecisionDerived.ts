import { useMemo } from 'react';
import { getPreDecisionHearingOutcome, getPreDecisionSessionOutcome } from '../../utils/hearingRules';
import {
    PRE_DECISION_OUTCOME_ADJOURN,
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from '../../constants/hearingOutcomes';
import type { PreDecisionHearingOutcomeKind } from '../../types';
import type { UseOrderFileLifecycleDerivedArgs } from './types';



export function usePreDecisionDerived(args: UseOrderFileLifecycleDerivedArgs) {
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

    return {
        preDecisionHearingsSorted,
        hasSessions,
        latestOutcome,
        isAdjourned,
        isCaseTerminated,
        preDecisionTerminalKind,
        showJudgeDecisionBlock,
        showJudgeDecisionTerminateOnly,
        showJudgeDecisionFullForm,
    };
}

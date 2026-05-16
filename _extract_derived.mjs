import fs from 'fs';

const rootPath = 'src/app/components/lawyer/Dashboard_Active_Order_File/ActiveOrderFileRoot.tsx';
const lines = fs.readFileSync(rootPath, 'utf8').split(/\r?\n/);
const derivedBody = lines.slice(1579, 2157).join('\n');

const hook = `import { useEffect, useMemo } from 'react';
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
        if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(base)) return;
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

${derivedBody}
}
`;

fs.writeFileSync(
    'src/app/components/lawyer/Dashboard_Active_Order_File/hooks/useOrderFileLifecycleDerived.ts',
    hook,
);
console.log('derived hook written');

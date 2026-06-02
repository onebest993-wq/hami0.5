export type { UseOrderFileLifecycleDerivedArgs } from './lifecycleDerived/types';

import type { UseOrderFileLifecycleDerivedArgs } from './lifecycleDerived/types';
import { useGrievanceLegalEndAutoFill } from './lifecycleDerived/useGrievanceLegalEndAutoFill';
import { useLifecyclePhaseDerived } from './lifecycleDerived/useLifecyclePhaseDerived';
import { useGrievanceWizardDerived } from './lifecycleDerived/useGrievanceWizardDerived';
import { useWorkspaceInsightsDerived } from './lifecycleDerived/useWorkspaceInsightsDerived';
import { usePreDecisionDerived } from './lifecycleDerived/usePreDecisionDerived';
import { useHearingChronologyDerived } from './lifecycleDerived/useHearingChronologyDerived';
import { useCassationDerived } from './lifecycleDerived/useCassationDerived';

export function useOrderFileLifecycleDerived(args: UseOrderFileLifecycleDerivedArgs) {
    useGrievanceLegalEndAutoFill(args);
    const phase = useLifecyclePhaseDerived(args);
    const grievance = useGrievanceWizardDerived(args, phase);
    const insights = useWorkspaceInsightsDerived(args);
    const preDecision = usePreDecisionDerived(args);
    const chronology = useHearingChronologyDerived(args, { effectiveJudgeDecisionDate: phase.effectiveJudgeDecisionDate });
    const cassation = useCassationDerived(args, {
        grievanceClosingHearingExists: chronology.grievanceClosingHearingExists,
        grievanceExpiredCanClose: grievance.grievanceExpiredCanClose,
        grievanceDecisionDateChronologyError: chronology.grievanceDecisionDateChronologyError,
    });

    return {
        ...phase,
        ...grievance,
        ...insights,
        ...preDecision,
        ...chronology,
        ...cassation,
    };
}

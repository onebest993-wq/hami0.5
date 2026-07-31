import type { CaseStage } from '@/app/types/criminal';

export type DecisionsScopeFilter =
    | 'all'
    | 'current'
    | 'previous'
    | 'investigation'
    | 'misdemeanor'
    | 'felony';

export function defaultDecisionsScopeForStage(_currentUiStage: CaseStage): DecisionsScopeFilter {
    return 'current';
}

import type { UseSmartFileJudgmentActionsOptions } from './judgment/judgmentHookTypes';
export type { UseSmartFileJudgmentActionsOptions } from './judgment/judgmentHookTypes';

import { useJudgmentConfirmAction } from './judgment/useJudgmentConfirmAction';
import { useAppealTransitionAction } from './judgment/useAppealTransitionAction';
import { useCrossAppealAndCassationActions } from './judgment/useCrossAppealAndCassationActions';
import { useStageTransitionActions } from './judgment/useStageTransitionActions';

export function useSmartFileJudgmentActions(options: UseSmartFileJudgmentActionsOptions) {
    return {
        ...useJudgmentConfirmAction(options),
        ...useAppealTransitionAction(options),
        ...useCrossAppealAndCassationActions(options),
        ...useStageTransitionActions(options),
    };
}

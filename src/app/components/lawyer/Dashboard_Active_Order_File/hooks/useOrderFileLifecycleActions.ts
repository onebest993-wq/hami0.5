export type { UseOrderFileLifecycleActionsArgs } from './lifecycleActions/types';

import type { UseOrderFileLifecycleActionsArgs } from './lifecycleActions/types';
import { createFinalizeCase } from './lifecycleActions/createFinalizeCase';
import { createNavigationActions } from './lifecycleActions/createNavigationActions';
import { createJudgeActions } from './lifecycleActions/createJudgeActions';
import { createGrievanceActions } from './lifecycleActions/createGrievanceActions';
import { createCassationActions } from './lifecycleActions/createCassationActions';
import { useHearingLifecycleActions } from './lifecycleActions/useHearingLifecycleActions';

export function useOrderFileLifecycleActions(args: UseOrderFileLifecycleActionsArgs) {
    const navigation = createNavigationActions(args);
    const finalizeCase = createFinalizeCase(args);
    const judge = createJudgeActions(args, { focusStep: navigation.focusStep });
    const grievance = createGrievanceActions(args, { finalizeCase });
    const cassation = createCassationActions(args, { finalizeCase });
    const hearing = useHearingLifecycleActions(args);

    return {
        ...navigation,
        ...judge,
        ...grievance,
        ...cassation,
        ...hearing,
        finalizeCase,
    };
}

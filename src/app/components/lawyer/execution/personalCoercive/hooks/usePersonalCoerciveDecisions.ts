import type { PersonalCoerciveFollowupPanelProps } from '../types';
import type { PersonalCoercivePanelState } from './usePersonalCoercivePanelState';
import {
    buildPersonalCoerciveDecisionsCtx,
    usePersonalCoerciveDecisionRowsStates,
    usePersonalCoerciveDecisionFinders,
    usePersonalCoerciveAppealRenderers,
} from './decisions';

export type PersonalCoerciveDecisions = ReturnType<typeof usePersonalCoerciveDecisions>;

/** Thin composer — domain logic lives under hooks/decisions/. */
export function usePersonalCoerciveDecisions(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
) {
    const ctx = buildPersonalCoerciveDecisionsCtx(props, state);
    const rows = usePersonalCoerciveDecisionRowsStates(ctx);
    const finders = usePersonalCoerciveDecisionFinders(ctx, rows);
    const appeal = usePersonalCoerciveAppealRenderers(ctx, rows);

    return {
        ...rows,
        ...finders,
        ...appeal,
    };
}

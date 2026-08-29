import type { PersonalCoerciveFollowupPanelProps } from '../types';
import type { PersonalCoercivePanelState } from './usePersonalCoercivePanelState';
import type { PersonalCoerciveDecisions } from './usePersonalCoerciveDecisions';
import {
    buildPersonalCoerciveDerivedCtx,
    usePersonalCoerciveDerivedLaneCore,
    usePersonalCoerciveDerivedFlowTravel,
    usePersonalCoerciveDossierJudgeDerived,
} from './derived';

export type PersonalCoerciveDerived = ReturnType<typeof usePersonalCoerciveDerived>;

/** Thin composer — domain logic lives under hooks/derived/. */
export function usePersonalCoerciveDerived(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
    decisions: PersonalCoerciveDecisions,
) {
    const ctx = buildPersonalCoerciveDerivedCtx(props, state, decisions);
    const lane = usePersonalCoerciveDerivedLaneCore(ctx);
    const flowTravel = usePersonalCoerciveDerivedFlowTravel(ctx, lane);
    const dossierJudge = usePersonalCoerciveDossierJudgeDerived(
        ctx,
        lane,
        flowTravel.showTravelBanSection,
    );

    return {
        ...lane,
        ...flowTravel,
        ...dossierJudge,
    };
}

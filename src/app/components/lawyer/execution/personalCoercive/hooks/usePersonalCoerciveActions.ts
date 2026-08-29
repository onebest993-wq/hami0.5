import type { PersonalCoerciveFollowupPanelProps } from '../types';
import type { PersonalCoercivePanelState } from './usePersonalCoercivePanelState';
import type { PersonalCoerciveDecisions } from './usePersonalCoerciveDecisions';
import type { PersonalCoerciveDerived } from './usePersonalCoerciveDerived';
import {
    buildPersonalCoerciveActionsCtx,
    usePersonalCoerciveSubmitCore,
    usePersonalCoerciveForcedBringActions,
    usePersonalCoerciveInvestigationActions,
    usePersonalCoerciveDetentionJudgeActions,
    usePersonalCoerciveTravelBanActions,
    usePersonalCoerciveDossierPresentationActions,
} from './actions';

export type PersonalCoerciveActions = ReturnType<typeof usePersonalCoerciveActions>;

/** Thin composer — domain logic lives under hooks/actions/. */
export function usePersonalCoerciveActions(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
    decisions: PersonalCoerciveDecisions,
    derived: PersonalCoerciveDerived,
) {
    const ctx = buildPersonalCoerciveActionsCtx(props, state, decisions, derived);
    const core = usePersonalCoerciveSubmitCore(ctx);
    const forcedBring = usePersonalCoerciveForcedBringActions(ctx, core);
    const investigation = usePersonalCoerciveInvestigationActions(ctx, core);
    const detentionJudge = usePersonalCoerciveDetentionJudgeActions(ctx, core);
    const travelBan = usePersonalCoerciveTravelBanActions(ctx, core);
    const dossierPresentation = usePersonalCoerciveDossierPresentationActions(ctx, core);

    return {
        ...core,
        ...forcedBring,
        ...investigation,
        ...detentionJudge,
        ...travelBan,
        ...dossierPresentation,
    };
}

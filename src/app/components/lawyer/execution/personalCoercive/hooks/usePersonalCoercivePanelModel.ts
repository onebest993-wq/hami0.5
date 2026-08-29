import type { PersonalCoerciveFollowupPanelProps } from '../types';
import { usePersonalCoercivePanelState } from './usePersonalCoercivePanelState';
import { usePersonalCoerciveDecisions } from './usePersonalCoerciveDecisions';
import { usePersonalCoerciveDerived } from './usePersonalCoerciveDerived';
import { usePersonalCoerciveActions } from './usePersonalCoerciveActions';

/** Composes Phase 1a priority hooks into one bag for the orchestrator. */
export function usePersonalCoercivePanelModel(props: PersonalCoerciveFollowupPanelProps) {
    const state = usePersonalCoercivePanelState(props);
    const decisions = usePersonalCoerciveDecisions(props, state);
    const derived = usePersonalCoerciveDerived(props, state, decisions);
    const actions = usePersonalCoerciveActions(props, state, decisions, derived);
    return { ...state, ...decisions, ...derived, ...actions };
}

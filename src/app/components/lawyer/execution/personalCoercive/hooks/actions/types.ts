import type { PersonalCoerciveFollowupPanelProps } from '../../types';
import type { PersonalCoercivePanelState } from '../usePersonalCoercivePanelState';
import type { PersonalCoerciveDecisions } from '../usePersonalCoerciveDecisions';
import type { PersonalCoerciveDerived } from '../usePersonalCoerciveDerived';

/** Flattened bag for personal-coercive action modules (props + priority hooks). */
export type PersonalCoerciveActionsCtx = PersonalCoerciveFollowupPanelProps &
    PersonalCoercivePanelState &
    PersonalCoerciveDecisions &
    PersonalCoerciveDerived;

export function buildPersonalCoerciveActionsCtx(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
    decisions: PersonalCoerciveDecisions,
    derived: PersonalCoerciveDerived,
): PersonalCoerciveActionsCtx {
    return { ...props, ...state, ...decisions, ...derived };
}

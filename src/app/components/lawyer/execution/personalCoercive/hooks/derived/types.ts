import type { PersonalCoerciveFollowupPanelProps } from '../../types';
import type { PersonalCoercivePanelState } from '../usePersonalCoercivePanelState';
import type { PersonalCoerciveDecisions } from '../usePersonalCoerciveDecisions';

/** Flattened bag for personal-coercive derived modules (props + state + decisions). */
export type PersonalCoerciveDerivedCtx = PersonalCoerciveFollowupPanelProps &
    PersonalCoercivePanelState &
    PersonalCoerciveDecisions;

export function buildPersonalCoerciveDerivedCtx(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
    decisions: PersonalCoerciveDecisions,
): PersonalCoerciveDerivedCtx {
    return { ...props, ...state, ...decisions };
}

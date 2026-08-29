import type { PersonalCoerciveFollowupPanelProps } from '../../types';
import type { PersonalCoercivePanelState } from '../usePersonalCoercivePanelState';

/** Flattened bag for personal-coercive decision modules (props + panel state). */
export type PersonalCoerciveDecisionsCtx = PersonalCoerciveFollowupPanelProps &
    PersonalCoercivePanelState;

export function buildPersonalCoerciveDecisionsCtx(
    props: PersonalCoerciveFollowupPanelProps,
    state: PersonalCoercivePanelState,
): PersonalCoerciveDecisionsCtx {
    return { ...props, ...state };
}

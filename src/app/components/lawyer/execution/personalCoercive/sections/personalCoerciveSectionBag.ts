import type { PersonalCoerciveFollowupPanelProps } from '../types';
import type { usePersonalCoercivePanelModel } from '../hooks/usePersonalCoercivePanelModel';

/**
 * Flattened bag available to personal-coercive section components:
 * panel props + composed panel model (state / decisions / derived / actions).
 */
export type PersonalCoerciveSectionBag = PersonalCoerciveFollowupPanelProps &
    ReturnType<typeof usePersonalCoercivePanelModel>;

/** Pick a typed slice of the panel bag for a section — avoids loose prop bags. */
export type PickPersonalCoerciveSectionProps<K extends keyof PersonalCoerciveSectionBag> = Pick<
    PersonalCoerciveSectionBag,
    K
>;

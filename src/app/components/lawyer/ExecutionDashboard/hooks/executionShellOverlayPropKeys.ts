/** مفاتيح shell overlays (بدون محضر المتابعة) — مُولَّد من scripts/generate-shell-overlay-infra.mjs */
import { EXECUTION_SHELL_OVERLAY_PROP_KEYS_HEAD } from './executionShellOverlayPropKeys.head';
import { EXECUTION_SHELL_OVERLAY_PROP_KEYS_TAIL } from './executionShellOverlayPropKeys.tail';

export const EXECUTION_SHELL_OVERLAY_PROP_KEYS = [
    ...EXECUTION_SHELL_OVERLAY_PROP_KEYS_HEAD,
    ...EXECUTION_SHELL_OVERLAY_PROP_KEYS_TAIL,
] as const;

export type ExecutionShellOverlayPropKey = (typeof EXECUTION_SHELL_OVERLAY_PROP_KEYS)[number];

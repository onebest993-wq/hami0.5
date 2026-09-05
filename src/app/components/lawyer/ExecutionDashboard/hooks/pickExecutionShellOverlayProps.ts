import { EXECUTION_SHELL_OVERLAY_PROP_KEYS } from './executionShellOverlayPropKeys';
import type { ExecutionShellOverlayPropKey } from './executionShellOverlayPropKeys';

/**
 * مفاتيح يقرأها ShellOverlays من scope الكامل وليست في القائمة المولَّدة.
 * بدونها pick-only يكسر نافذة مصاريف التخلية.
 */
export const EXECUTION_SHELL_OVERLAY_SCOPE_GAP_KEYS = [
    'showEvictionExpenseModal',
    'setShowEvictionExpenseModal',
] as const;

function applyShellOverlayScopeGapKeys(
    target: Record<string, unknown>,
    sources: Record<string, unknown>,
): void {
    for (const key of EXECUTION_SHELL_OVERLAY_SCOPE_GAP_KEYS) {
        target[key] = sources[key];
    }
}

export function pickExecutionShellOverlayProps(
    sources: Record<string, unknown>,
): Record<ExecutionShellOverlayPropKey, unknown> {
    const out = {} as Record<ExecutionShellOverlayPropKey, unknown>;
    for (const key of EXECUTION_SHELL_OVERLAY_PROP_KEYS) {
        out[key] = sources[key];
    }
    applyShellOverlayScopeGapKeys(out as Record<string, unknown>, sources);
    if (sources.LazyPoliceAssistanceDetailsModal != null) {
        (out as Record<string, unknown>).PoliceAssistanceDetailsModal =
            sources.LazyPoliceAssistanceDetailsModal;
    }
    return out;
}

/** يحدّث ref ثابت دون إنشاء كائن props جديد في كل render */
export function assignExecutionShellOverlayScope(
    target: Record<string, unknown>,
    sources: Record<string, unknown>,
): void {
    for (const key of EXECUTION_SHELL_OVERLAY_PROP_KEYS) {
        target[key] = sources[key];
    }
    applyShellOverlayScopeGapKeys(target, sources);
    if (sources.LazyPoliceAssistanceDetailsModal != null) {
        target.PoliceAssistanceDetailsModal = sources.LazyPoliceAssistanceDetailsModal;
    }
}

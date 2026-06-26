import { EXECUTION_SHELL_OVERLAY_PROP_KEYS } from './executionShellOverlayPropKeys';
import type { ExecutionShellOverlayPropKey } from './executionShellOverlayPropKeys';

export function pickExecutionShellOverlayProps(
    sources: Record<string, unknown>,
): Record<ExecutionShellOverlayPropKey, unknown> {
    const out = {} as Record<ExecutionShellOverlayPropKey, unknown>;
    for (const key of EXECUTION_SHELL_OVERLAY_PROP_KEYS) {
        out[key] = sources[key];
    }
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
    if (sources.LazyPoliceAssistanceDetailsModal != null) {
        target.PoliceAssistanceDetailsModal = sources.LazyPoliceAssistanceDetailsModal;
    }
}

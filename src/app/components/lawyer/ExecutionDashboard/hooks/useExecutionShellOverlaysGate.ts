import { useMemo } from 'react';
import {
    isExecutionOtherShellOverlayUrgent,
    type ExecutionShellOverlayModalFlags,
} from './executionShellOverlayModalFlags';

export type { ExecutionShellOverlayModalFlags };

/** overlays عند نية نافذة فقط — محضر المتابعة له مسار مستقل. */
export function useExecutionShellOverlaysGate(modals: ExecutionShellOverlayModalFlags) {
    const overlayUrgent = useMemo(
        () => isExecutionOtherShellOverlayUrgent(modals),
        [modals],
    );

    return { shellOverlaysReady: overlayUrgent, overlayUrgent };
}

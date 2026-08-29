import React from 'react';
import { resolveExecutionShellOverlayInstantPaint } from './resolveExecutionShellOverlayInstantPaint';
import {
    ExecutionAppointmentInstantFrame,
    ExecutionDecisionsInstantFrame,
    ExecutionDocumentsInstantFrame,
    ExecutionFullTimelineInstantFrame,
    ExecutionNamedOverlayInstantFrame,
    ExecutionNotesInstantFrame,
    ExecutionSeizedAssetsInstantFrame,
} from './executionOverlayInstantPresets';

/** أول إطار أثناء انتظار برميل النوافذ — هيكل مطابق للنافذة المفتوحة، مع إغلاق يعمل. */
export function ExecutionShellOverlayInstantPaint({
    scope,
}: {
    scope: Record<string, unknown>;
}): React.ReactElement {
    const paint = resolveExecutionShellOverlayInstantPaint(scope);
    switch (paint.kind) {
        case 'notes':
            return <ExecutionNotesInstantFrame onClose={paint.onClose} />;
        case 'appointment':
            return <ExecutionAppointmentInstantFrame onClose={paint.onClose} />;
        case 'documents':
            return <ExecutionDocumentsInstantFrame onClose={paint.onClose} />;
        case 'decisions':
            return <ExecutionDecisionsInstantFrame onClose={paint.onClose} />;
        case 'timeline':
            return <ExecutionFullTimelineInstantFrame onClose={paint.onClose} />;
        case 'seized-assets':
            return <ExecutionSeizedAssetsInstantFrame onClose={paint.onClose} />;
        default:
            return (
                <ExecutionNamedOverlayInstantFrame title={paint.title} onClose={paint.onClose} />
            );
    }
}

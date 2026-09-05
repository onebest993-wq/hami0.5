import React from 'react';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import { rememberExecutionArchiveFirstOpenIndex } from '@/app/runtime/executionArchiveFirstOpenClick';
import { ExecutionArchiveCardPaintSlot } from './ExecutionArchiveCardPaintSlot';

/** هيكل أول إطار — يحفظ الفهرس عند رفع الإصبع دون فتح الإضبارة وسط اللمسة. */
export function ExecutionArchiveQueuedPaintSlot({ slot }: { slot: number }): React.ReactElement {
    const press = useScrollSafePress({
        onPress: () => rememberExecutionArchiveFirstOpenIndex(slot),
    });

    return (
        <div
            className="min-w-0"
            data-testid="execution-archive-queued-paint-slot"
            onPointerDown={press.onPointerDown}
            onPointerMove={press.onPointerMove}
            onPointerUp={press.onPointerUp}
            onPointerCancel={press.onPointerCancel}
            onClick={press.onClick}
        >
            <ExecutionArchiveCardPaintSlot />
        </div>
    );
}

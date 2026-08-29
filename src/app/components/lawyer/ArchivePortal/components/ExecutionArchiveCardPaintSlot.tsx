import React from 'react';
import { EXECUTION_ARCHIVE_CARD_PAINT_SLOT_CLASS } from '../executionArchiveVisualLite';

/** هيكل بطاقة صامت — يحجز المكان حتى تُقيَّم ExecutionSmartCard. ليس بيانات وهمية. */
export function ExecutionArchiveCardPaintSlot(): React.ReactElement {
    return (
        <div
            className={EXECUTION_ARCHIVE_CARD_PAINT_SLOT_CLASS}
            aria-hidden
            data-testid="execution-archive-card-paint-slot"
        />
    );
}

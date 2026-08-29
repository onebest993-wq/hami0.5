import React from 'react';
import {
    EXECUTION_ARCHIVE_PREVIEW_LAYER_TEST_ID,
    EXECUTION_ARCHIVE_PREVIEW_OVERLAY_CLASS,
    EXECUTION_ARCHIVE_PREVIEW_PANEL_CLASS,
} from '../executionArchivePreviewLayer';

/** هيكل لوحة صامت — يحجز هندسة المعاينة حتى تُقيَّم النافذة. ليس بيانات وهمية. */
export function ExecutionArchivePreviewPaintSlot(): React.ReactElement {
    return (
        <div
            className={EXECUTION_ARCHIVE_PREVIEW_OVERLAY_CLASS}
            data-testid={EXECUTION_ARCHIVE_PREVIEW_LAYER_TEST_ID}
            data-hami-overlay-safe="1"
            role="presentation"
            aria-busy="true"
            aria-label="جاري تجهيز تفاصيل الإضبارة"
        >
            <div className={`${EXECUTION_ARCHIVE_PREVIEW_PANEL_CLASS} min-h-[16rem]`} aria-hidden />
        </div>
    );
}

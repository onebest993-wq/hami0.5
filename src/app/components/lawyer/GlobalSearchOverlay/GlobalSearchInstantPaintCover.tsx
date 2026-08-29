import React from 'react';

import { GlobalSearchOverlayLayerFrame } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayLayerFrame';
import { GlobalSearchInstantSheetChrome } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantSheetChrome';
import { GlobalSearchShellPortal } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchShellPortal';

type GlobalSearchInstantPaintCoverProps = {
    onClose: () => void;
};

/**
 * غطاء Suspense على MainView — رأس البحث فوراً بلا نتائج ثقيلة.
 */
export function GlobalSearchInstantPaintCover({
    onClose,
}: GlobalSearchInstantPaintCoverProps): React.ReactElement {
    return (
        <GlobalSearchShellPortal>
            <GlobalSearchOverlayLayerFrame
                open
                onClose={onClose}
                paint
                coverTestId="global-search-instant-cover"
                armBackdropClose={false}
            >
                <GlobalSearchInstantSheetChrome onClose={onClose} />
            </GlobalSearchOverlayLayerFrame>
        </GlobalSearchShellPortal>
    );
}

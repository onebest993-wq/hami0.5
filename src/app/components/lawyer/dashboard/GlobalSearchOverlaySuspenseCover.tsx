import React, { useLayoutEffect } from 'react';
import { LazyGlobalSearchInstantPaintCover } from '@/app/components/lawyer/dashboard/overlayInstantChromeLazy';

function GlobalSearchDomPaintCover(): null {
    useLayoutEffect(() => {
        void import('@/app/runtime/globalSearchInstantPaint')
            .then((m) => {
                m.paintGlobalSearchInstantChrome();
            })
            .catch(() => undefined);
        void LazyGlobalSearchInstantPaintCover.preload();
    }, []);
    return null;
}

/**
 * غطاء Suspense للبحث: إن اكتمل preload يُرسم InstantPaintCover فوراً.
 * وإلا طلاء DOM (جسر الكروم) — بلا nested fallback={null}.
 */
export function GlobalSearchOverlaySuspenseCover({
    onClose,
}: {
    onClose: () => void;
}): React.ReactElement | null {
    if (LazyGlobalSearchInstantPaintCover.isPreloaded()) {
        return <LazyGlobalSearchInstantPaintCover onClose={onClose} />;
    }
    return <GlobalSearchDomPaintCover />;
}

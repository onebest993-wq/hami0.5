import React, { Suspense } from 'react';

type PreloadableLike<P> = React.ComponentType<P> & {
    isPreloaded?: () => boolean;
};

/**
 * إن اكتمل preload تُرسم النافذة في نفس الـ commit.
 * وإلا هيكل فوري يعمل (إغلاق) حتى تُقيَّم الوحدة.
 */
export function PreloadableOverlayGate<P extends object>({
    lazy: Lazy,
    lazyProps,
    fallback,
}: {
    lazy: PreloadableLike<P>;
    lazyProps: P;
    fallback: React.ReactNode;
}): React.ReactElement {
    if (typeof Lazy.isPreloaded === 'function' && Lazy.isPreloaded()) {
        return <Lazy {...lazyProps} />;
    }
    return (
        <Suspense fallback={fallback}>
            <Lazy {...lazyProps} />
        </Suspense>
    );
}

import React, { Suspense, useEffect, useState } from 'react';

type PreloadableLike<P> = React.ComponentType<P> & {
    isPreloaded?: () => boolean;
    preload?: () => Promise<void>;
};

/**
 * إن اكتمل preload تُرسم النافذة في نفس الـ commit.
 * وإلا هيكل فوري يعمل حتى تُقيَّم الوحدة — ثم يُعاد الرسم فور اكتمال
 * `preload` (مسار Suspense وحده كان يبقى على الهيكل في بعض بيئات الاختبار
 * وعند السباق مع useEffect).
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
    const preloaded =
        typeof Lazy.isPreloaded === 'function' ? Lazy.isPreloaded() : false;
    const [, setPreloadEpoch] = useState(0);

    useEffect(() => {
        if (typeof Lazy.isPreloaded === 'function' && Lazy.isPreloaded()) return;
        if (typeof Lazy.preload !== 'function') return;
        let cancelled = false;
        void Lazy.preload().then(() => {
            if (!cancelled) setPreloadEpoch((n) => n + 1);
        });
        return () => {
            cancelled = true;
        };
    }, [Lazy]);

    if (preloaded) {
        return <Lazy {...lazyProps} />;
    }
    return (
        <Suspense fallback={fallback}>
            <Lazy {...lazyProps} />
        </Suspense>
    );
}

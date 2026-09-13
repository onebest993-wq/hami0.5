import React, { Suspense, useEffect, useState } from 'react';
import { useColdAtMount } from './useColdAtMount';

export type PreloadableLike<P> = React.ComponentType<P> & {
    isPreloaded?: () => boolean;
    preload?: () => Promise<void>;
};

/**
 * إن اكتمل preload قبل التركيب تُرسم النافذة في نفس الـ commit.
 * وإلا هيكل فوري يعمل حتى تُقيَّم الوحدة — ثم يُعاد الرسم فور اكتمال
 * `preload` (مسار Suspense وحده كان يبقى على الهيكل في بعض بيئات الاختبار
 * وعند السباق مع useEffect).
 *
 * **والاختيارُ بين الطريقين يُثبَّت عند التركيب** (`useColdAtMount`). كان يُعاد حسابُه في كلّ
 * رسم، فإعادةُ الرسم التي يُطلقها `preload` نفسُه كانت تنزع `Suspense` من حول نافذةٍ عُرضت —
 * فتُهدم وتُركَّب من جديد وتضيع حالتُها.
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
    const coldAtMount = useColdAtMount(
        () => typeof Lazy.isPreloaded === 'function' && Lazy.isPreloaded(),
    );
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

    if (!coldAtMount) {
        return <Lazy {...lazyProps} />;
    }
    return (
        <Suspense fallback={fallback}>
            <Lazy {...lazyProps} />
        </Suspense>
    );
}

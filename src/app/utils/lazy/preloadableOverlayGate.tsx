import React, { Suspense, useEffect, useState } from 'react';

export type PreloadableLike<P> = React.ComponentType<P> & {
    isPreloaded?: () => boolean;
    preload?: () => Promise<void>;
};

/**
 * إن اكتمل preload تُرسم النافذة في نفس الـ commit.
 * وإلا هيكل فوري يعمل حتى تُقيَّم الوحدة — ثم يُعاد الرسم فور اكتمال
 * `preload` (مسار Suspense وحده كان يبقى على الهيكل في بعض بيئات الاختبار
 * وعند السباق مع useEffect).
 *
 * **وغلافُ `Suspense` دائمٌ لا يُقرَّر بالجاهزية في الرسم.** كان يُنزع حين تصير الوحدةُ محمَّلة، فإعادةُ
 * الرسم التي يُطلقها `preload` نفسُه كانت تُبدّل نوعَ العنصر حول نافذةٍ عُرضت — فتُهدم وتُركَّب من جديد
 * وتضيع حالتُها (قِيس في E2E). **والمحمَّلُ لا يعلّق داخله**: `createPreloadableLazyComponent` يرسمه مباشرةً.
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

    return (
        <Suspense fallback={fallback}>
            <Lazy {...lazyProps} />
        </Suspense>
    );
}

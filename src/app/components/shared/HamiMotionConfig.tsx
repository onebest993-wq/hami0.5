import React, { useMemo } from 'react';
import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { MotionConfigContext } from '@/app/motion/motionConfigContext';

/**
 * يطبّق prefers-reduced-motion — بمزوّد سياقٍ **ثابت منذ أوّل رسم**.
 *
 * كان جسراً كسولاً: يُركّب الأبناء عارية `<>{children}</>` ثم يلفّها بـ`MotionConfig`
 * متى وصل مقطع الحركة. وتغيّر الغلاف بعد التركيب يُغيّر عمق الشجرة، فيُفكّك React
 * كلّ ما تحته ويُعيد إنشاءه: **التطبيق بأسره يُعاد تركيبه بعد نحو ١.٤ ثانية**، فتعود
 * كل `useState` إلى قيمتها الأولى بلا استدعاء أيّ setter. وأثرُه المقيس أنّ أيّ سطحٍ
 * يفتحه المستخدم في تلك المدّة يُغلق نفسه بلا خطأ ولا أثر — وهو FINDING-025، وجذر
 * FINDING-023.
 *
 * والسياق وحده يكفي: `MotionConfig` في المكتبة ليس إلا مزوّداً لهذا السياق نفسه،
 * وقيمته هنا مطابقة لقيمة المكتبة الافتراضية عدا `reducedMotion`. فالمحرّك يبقى
 * كسولاً (السياق مقطعٌ مستقلّ بمئات البايتات)، والبنية تبقى ثابتة، والسلوك كما كان.
 */
export function HamiMotionConfig({ children }: { children: React.ReactNode }) {
    const reduceMotion = useReduceMotion();

    const value = useMemo(
        () => ({
            transformPagePoint: (point: { x: number; y: number }) => point,
            isStatic: false,
            reducedMotion: (reduceMotion ? 'always' : 'user') as 'always' | 'user',
        }),
        [reduceMotion],
    );

    return <MotionConfigContext.Provider value={value}>{children}</MotionConfigContext.Provider>;
}

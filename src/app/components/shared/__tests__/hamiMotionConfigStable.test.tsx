/**
 * FINDING-025 — غلاف الحركة كان يظهر بعد التركيب فيُبيد حالة التطبيق كلّها.
 *
 * `HamiMotionConfig` كان جسراً كسولاً: يُركّب الأبناء عارية `<>{children}</>` ثم
 * يلفّها بـ`MotionConfig` متى وصل مقطع الحركة. وتغيّر الغلاف بعد التركيب يُغيّر
 * عمق الشجرة، فيُفكّك React كلّ ما تحته ويُعيد إنشاءه: تعود كل `useState` إلى
 * قيمتها الأولى بلا استدعاء أيّ setter — فيُغلق أيّ سطحٍ فتحه المستخدم قبل ذلك،
 * بلا خطأ ولا أثر (وهو جذر FINDING-023: ١٧ إخفاق E2E ← ٧).
 *
 * الشرط المحروس: **المزوّد موجودٌ في أوّل رسم** — لا بعد أثرٍ ولا بعد تحميل مقطع.
 */
import { describe, expect, it } from 'vitest';
import { useContext } from 'react';
import { render } from '@testing-library/react';
import { HamiMotionConfig } from '@/app/components/shared/HamiMotionConfig';
import { MotionConfigContext } from '@/app/motion/motionConfigContext';

const seen: string[] = [];

function ReducedMotionProbe() {
    /* يُقرأ أثناء الرسم نفسه — لا في أثر */
    seen.push(useContext(MotionConfigContext).reducedMotion);
    return null;
}

describe('HamiMotionConfig — مزوّد ثابت من أوّل رسم', () => {
    it('السياق مُقدَّم في أوّل رسم، لا بعد تحميل مقطع الحركة', () => {
        seen.length = 0;

        render(
            <HamiMotionConfig>
                <ReducedMotionProbe />
            </HamiMotionConfig>,
        );

        expect(seen.length).toBeGreaterThan(0);
        /*
         * `never` هي قيمة المكتبة الافتراضية حين **لا مزوّد**. فظهورها في أوّل
         * رسم يعني أنّ الأبناء رُكّبوا خارج الغلاف — وهو عين العطب.
         */
        expect(seen[0]).not.toBe('never');
        expect(['always', 'user']).toContain(seen[0]);
    });

    it('لا يتبدّل المزوّد بين الرسمات — البنية ثابتة', () => {
        seen.length = 0;

        const view = render(
            <HamiMotionConfig>
                <ReducedMotionProbe />
            </HamiMotionConfig>,
        );
        view.rerender(
            <HamiMotionConfig>
                <ReducedMotionProbe />
            </HamiMotionConfig>,
        );

        expect(seen.length).toBeGreaterThanOrEqual(2);
        expect(new Set(seen).size).toBe(1);
    });
});

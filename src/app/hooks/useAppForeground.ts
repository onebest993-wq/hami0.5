import { useEffect, useState } from 'react';
import { isAppForeground, subscribeAppForeground } from '@/app/runtime/appForegroundGate';

/**
 * هل التطبيق في المقدّمة الآن؟ يُعاد الرسم عند كل تحوّل.
 *
 * للاتصالات الدائمة والمشتركين الذين يُفكَّكون بتنظيف `useEffect`: ضَع القيمة في
 * شرط التمكين، فيصير الانتقال للخلفية تفكيكاً طبيعياً والعودة إعادة اشتراك — بلا
 * منطق تعليق يدوي داخل كل خدمة.
 *
 * للمؤقّتات الدورية استخدم `useVisibilityAwareInterval` بدلاً من هذا.
 */
export function useAppForeground(): boolean {
    const [foreground, setForeground] = useState(isAppForeground);

    useEffect(() => {
        /* الحالة قد تتغيّر بين أول رسم وتنفيذ الأثر */
        setForeground(isAppForeground());
        return subscribeAppForeground({
            onSuspend: () => setForeground(false),
            onResume: () => setForeground(true),
        });
    }, []);

    return foreground;
}

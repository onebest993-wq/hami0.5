import { useEffect, useState } from 'react';
import { isTasksDatePickerGraceActive } from '@/app/components/lawyer/dashboard/tasksManager/tasksDatePickerGrace';

/**
 * ارتفاع لوحة المفاتيح الافتراضية (px) — لرفع bottom sheet فوق الكيبورد على iOS/Android.
 * يعود 0 على سطح المكتب أو عند عدم دعم visualViewport.
 */
export function useMobileKeyboardInset(): number {
    const [inset, setInset] = useState(0);

    useEffect(() => {
        const vv = window.visualViewport;
        if (!vv) return;

        const update = () => {
            if (isTasksDatePickerGraceActive()) return;
            const gap = window.innerHeight - vv.height - vv.offsetTop;
            setInset(gap > 48 ? Math.round(gap) : 0);
        };

        vv.addEventListener('resize', update);
        vv.addEventListener('scroll', update);
        update();

        return () => {
            vv.removeEventListener('resize', update);
            vv.removeEventListener('scroll', update);
        };
    }, []);

    return inset;
}

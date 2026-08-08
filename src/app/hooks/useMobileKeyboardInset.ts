import { useEffect, useState } from 'react';
import { purgeStaticBootShellAfterBoot } from '@/app/bootstrap/bootStaticShell';
import { isTasksDatePickerGraceActive } from '@/app/components/lawyer/dashboard/tasksManager/tasksDatePickerGrace';

/**
 * ارتفاع لوحة المفاتيح الافتراضية (px) — لرفع bottom sheet فوق الكيبورد على iOS/Android.
 * يعود 0 على سطح المكتب أو عند عدم دعم visualViewport.
 * @param enabled عطّل المستمعين عندما الطبقة مغلقة/دافئة مخفية (توفير بطارية).
 */
export function useMobileKeyboardInset(enabled = true, snap = false): number {
    const [inset, setInset] = useState(0);

    useEffect(() => {
        if (!enabled) {
            setInset(0);
            return;
        }
        const vv = window.visualViewport;
        if (!vv) return;

        let frame = 0;

        const update = () => {
            if (isTasksDatePickerGraceActive()) return;
            const gap = window.innerHeight - vv.height - vv.offsetTop;
            const target = gap > 48 ? Math.round(gap) : 0;
            if (target > 0) {
                purgeStaticBootShellAfterBoot();
            }
            setInset((prev) => {
                if (target === 0) return 0;
                if (snap) return target;
                if (Math.abs(prev - target) < 6) return target;
                return Math.round(prev + (target - prev) * 0.42);
            });
        };

        const scheduleUpdate = () => {
            if (frame) cancelAnimationFrame(frame);
            frame = requestAnimationFrame(update);
        };

        vv.addEventListener('resize', scheduleUpdate);
        vv.addEventListener('scroll', scheduleUpdate);
        scheduleUpdate();

        return () => {
            if (frame) cancelAnimationFrame(frame);
            vv.removeEventListener('resize', scheduleUpdate);
            vv.removeEventListener('scroll', scheduleUpdate);
        };
    }, [enabled, snap]);

    return enabled ? inset : 0;
}

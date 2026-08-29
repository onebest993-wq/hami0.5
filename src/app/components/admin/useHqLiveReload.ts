import { useEffect, useRef } from 'react';
import { HQ_STATUS_REFRESH_EVENT } from '@/app/components/admin/hqStatusEvents';
import { useHqPaneActive } from '@/app/components/admin/hqPaneActive';

/**
 * تبويبات المقر المُبقاء حيّة تُعيد الجلب بعد طفرة من سطح آخر
 * (اعتماد توثيق، حظر من الملف، حذف من البلاغات…) دون انتظار زر التحديث.
 * التبويب المخفي يُعلَّم وسخاً ويُزامَن عند إظهاره — لا جلب خلف الشاشة.
 */
export function useHqLiveReload(reload: () => void | Promise<void>): void {
    const paneActive = useHqPaneActive();
    const reloadRef = useRef(reload);
    reloadRef.current = reload;
    const dirtyRef = useRef(false);
    const scheduledRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const run = () => {
            scheduledRef.current = false;
            if (cancelled) return;
            void reloadRef.current();
        };
        const onMutate = () => {
            if (!paneActive) {
                dirtyRef.current = true;
                return;
            }
            if (scheduledRef.current) return;
            scheduledRef.current = true;
            queueMicrotask(run);
        };
        window.addEventListener(HQ_STATUS_REFRESH_EVENT, onMutate);
        return () => {
            cancelled = true;
            window.removeEventListener(HQ_STATUS_REFRESH_EVENT, onMutate);
            scheduledRef.current = false;
        };
    }, [paneActive]);

    useEffect(() => {
        if (!paneActive || !dirtyRef.current) return;
        dirtyRef.current = false;
        void reloadRef.current();
    }, [paneActive]);
}

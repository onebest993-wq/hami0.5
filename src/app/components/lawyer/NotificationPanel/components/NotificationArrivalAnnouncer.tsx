import React, { useEffect, useRef, useState } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';

/** صياغة عربية صحيحة لعدد الإشعارات الواصلة (مفرد/مثنى/جمع) */
function formatArrivalMessage(count: number): string {
    if (count === 1) return 'وصل إشعار جديد';
    if (count === 2) return 'وصل إشعاران جديدان';
    if (count >= 3 && count <= 10) return `وصلت ${count} إشعارات جديدة`;
    return `وصل ${count} إشعاراً جديداً`;
}

/**
 * منطقة إعلان حيّة لقارئات الشاشة — تعلن وصول إشعارات جديدة أثناء فتح اللوحة.
 * تلتقط الحالة الابتدائية عند الفتح ثم تعلن فقط ما يصل بعدها.
 */
export function NotificationArrivalAnnouncer() {
    const notifications = useNotificationStore((s) => s.notifications);
    const [message, setMessage] = useState('');
    const knownIdsRef = useRef<Set<string> | null>(null);
    const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (knownIdsRef.current === null) {
            knownIdsRef.current = new Set(notifications.map((n) => n.id));
            return;
        }
        const known = knownIdsRef.current;
        let arrived = 0;
        for (const n of notifications) {
            if (known.has(n.id)) continue;
            known.add(n.id);
            if (!n.isRead) arrived += 1;
        }
        if (arrived === 0) return;

        setMessage(formatArrivalMessage(arrived));
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        // تفريغ الرسالة لاحقاً ليُعاد نطق نفس النص عند تكرار الوصول
        clearTimerRef.current = setTimeout(() => setMessage(''), 4000);
    }, [notifications]);

    useEffect(() => {
        return () => {
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        };
    }, []);

    return (
        <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {message}
        </div>
    );
}

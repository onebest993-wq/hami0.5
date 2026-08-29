import { useSyncExternalStore } from 'react';
import {
    isNotificationShellSnappedOpen,
    NOTIFICATION_SHELL_SNAP_EVENT,
    readNotificationShellSnapState,
} from '@/app/services/notifications/notificationShellSnap';

/**
 * ربط React بستارة html[data-hami-notifications-*] عبر حدث snap —
 * نفس نمط التقويم (scheduleShellSnap): بلا مراقبة DOM يدوية وبلا قراءة أثناء render.
 */
function subscribeToNotificationShellSnap(onChange: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    window.addEventListener(NOTIFICATION_SHELL_SNAP_EVENT, onChange);
    return () => window.removeEventListener(NOTIFICATION_SHELL_SNAP_EVENT, onChange);
}

function readSnapPresent(): boolean {
    const snap = readNotificationShellSnapState();
    return snap.open || snap.closing;
}

function readClosedOnServer(): boolean {
    return false;
}

export type NotificationShellSnapSurface = {
    /** الستارة مفتوحة الآن — تفاعل وتركيز وسحب */
    open: boolean;
    /** حاضرة بصرياً: مفتوحة أو تهبط — تركيب وقفل تمرير حتى نهاية الحركة */
    present: boolean;
};

export function useNotificationShellSnapSurface(): NotificationShellSnapSurface {
    const open = useSyncExternalStore(
        subscribeToNotificationShellSnap,
        isNotificationShellSnappedOpen,
        readClosedOnServer,
    );
    const present = useSyncExternalStore(
        subscribeToNotificationShellSnap,
        readSnapPresent,
        readClosedOnServer,
    );
    return { open, present };
}

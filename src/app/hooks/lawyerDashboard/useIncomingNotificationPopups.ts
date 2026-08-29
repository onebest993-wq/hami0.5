import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { areInAppNotificationsEnabled } from '@/app/services/settings/settingsRuntime';
import { HAMI_INBOX_NOTIFICATION_ARRIVED } from '@/app/runtime/inboxNotificationArrival';
import {
    HAMI_APP_STATE_EVENT,
    type HamiAppStateDetail,
} from '@/app/runtime/appStateEvents';
import {
    knownPopupIdsForUser,
    rememberPopupNotificationId,
} from '@/app/hooks/lawyerDashboard/incomingNotificationPopupMemory';
import { announceIncomingNotificationArrival } from '@/app/hooks/lawyerDashboard/incomingNotificationPopupArrival';
import {
    INCOMING_POPUP_MAX_VISIBLE,
    isEligibleInAppPopup,
    mergeIncomingPopupQueue,
    type IncomingNotificationPopup,
} from '@/app/hooks/lawyerDashboard/incomingNotificationPopupModel';

const AUTO_DISMISS_MS = 6_500;

export type { IncomingNotificationPopup };

export function useIncomingNotificationPopups(options: {
    userId: string;
    isPanelOpen: boolean;
    enabled?: boolean;
}) {
    const { userId, isPanelOpen, enabled = true } = options;
    const notifications = useNotificationStore((s) => s.notifications);
    const isLoading = useNotificationStore((s) => s.isLoading);
    const hasHydratedOnce = useNotificationStore((s) => s.hasHydratedOnce);

    const [queue, setQueue] = useState<IncomingNotificationPopup[]>([]);
    const baselineReadyRef = useRef(false);
    const isPanelOpenRef = useRef(isPanelOpen);
    isPanelOpenRef.current = isPanelOpen;
    const dismissTimersRef = useRef<Map<string, number>>(new Map());

    const clearTimer = useCallback((id: string) => {
        const t = dismissTimersRef.current.get(id);
        if (t !== undefined) {
            window.clearTimeout(t);
            dismissTimersRef.current.delete(id);
        }
    }, []);

    const dismiss = useCallback(
        (id: string) => {
            clearTimer(id);
            setQueue((prev) => prev.filter((p) => p.id !== id));
        },
        [clearTimer],
    );

    const scheduleDismiss = useCallback(
        (id: string) => {
            clearTimer(id);
            const t = window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
            dismissTimersRef.current.set(id, t);
        },
        [clearTimer, dismiss],
    );

    const queueRef = useRef(queue);
    queueRef.current = queue;

    const enqueueFresh = useCallback(
        (fresh: NotificationModel[]) => {
            if (fresh.length === 0) return;
            const newest = fresh[0];
            if (newest) announceIncomingNotificationArrival(newest);
            setQueue((prev) => mergeIncomingPopupQueue(prev, fresh, INCOMING_POPUP_MAX_VISIBLE));
        },
        [],
    );

    useEffect(() => {
        const timers = dismissTimersRef.current;
        return () => {
            for (const t of timers.values()) window.clearTimeout(t);
            timers.clear();
        };
    }, []);

    useEffect(() => {
        if (!userId) {
            baselineReadyRef.current = false;
            setQueue([]);
            return;
        }
        baselineReadyRef.current = false;
        setQueue([]);
    }, [userId]);

    useEffect(() => {
        if (!enabled || !areInAppNotificationsEnabled() || !userId) return;
        const known = knownPopupIdsForUser(userId);

        if (!baselineReadyRef.current) {
            if (!hasHydratedOnce) return;
            if (isLoading && notifications.length === 0) return;
            if (known.size === 0) {
                for (const n of notifications) rememberPopupNotificationId(known, n.id);
                baselineReadyRef.current = true;
                return;
            }
            baselineReadyRef.current = true;
        }

        if (isPanelOpen) {
            setQueue([]);
            for (const n of notifications) rememberPopupNotificationId(known, n.id);
            return;
        }

        const fresh = notifications.filter((n) => !known.has(n.id) && isEligibleInAppPopup(n));
        for (const n of notifications) {
            if (!known.has(n.id)) rememberPopupNotificationId(known, n.id);
        }
        enqueueFresh(fresh);
    }, [enabled, enqueueFresh, hasHydratedOnce, isLoading, isPanelOpen, notifications, userId]);

    useEffect(() => {
        if (!enabled || !userId) return;
        const onArrived = (event: Event) => {
            const n = (event as CustomEvent<NotificationModel>).detail;
            if (!n?.id || isPanelOpenRef.current) return;
            if (!baselineReadyRef.current || !isEligibleInAppPopup(n)) return;
            const known = knownPopupIdsForUser(userId);
            if (known.has(n.id)) return;
            rememberPopupNotificationId(known, n.id);
            enqueueFresh([n]);
        };
        window.addEventListener(HAMI_INBOX_NOTIFICATION_ARRIVED, onArrived);
        return () => window.removeEventListener(HAMI_INBOX_NOTIFICATION_ARRIVED, onArrived);
    }, [enabled, enqueueFresh, userId]);

    useEffect(() => {
        if (typeof document !== 'undefined' && document.hidden) {
            for (const id of [...dismissTimersRef.current.keys()]) clearTimer(id);
            return;
        }
        for (const item of queue) {
            if (!dismissTimersRef.current.has(item.id)) scheduleDismiss(item.id);
        }
        for (const id of [...dismissTimersRef.current.keys()]) {
            if (!queue.some((q) => q.id === id)) clearTimer(id);
        }
    }, [clearTimer, queue, scheduleDismiss]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const pause = () => {
            for (const id of [...dismissTimersRef.current.keys()]) clearTimer(id);
        };

        const resume = () => {
            for (const item of queueRef.current) {
                if (!dismissTimersRef.current.has(item.id)) scheduleDismiss(item.id);
            }
        };

        const onVisibility = () => {
            if (document.hidden) pause();
            else resume();
        };

        const onPageHide = () => {
            pause();
        };

        const onAppState = (event: Event) => {
            const detail = (event as CustomEvent<HamiAppStateDetail>).detail;
            if (detail?.isActive === false) pause();
            else if (!document.hidden) resume();
        };

        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener(HAMI_APP_STATE_EVENT, onAppState);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener(HAMI_APP_STATE_EVENT, onAppState);
        };
    }, [clearTimer, scheduleDismiss]);

    return { queue, dismiss };
}

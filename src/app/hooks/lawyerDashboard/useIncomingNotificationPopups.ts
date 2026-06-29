import { useCallback, useEffect, useRef, useState } from 'react';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { areInAppNotificationsEnabled } from '@/app/services/settings/settingsRuntime';

const MAX_VISIBLE = 2;
const AUTO_DISMISS_MS = 6_500;

export type IncomingNotificationPopup = {
    id: string;
    title: string;
    message: string;
    createdAt: string;
};

function toPopup(n: NotificationModel): IncomingNotificationPopup {
    return {
        id: n.id,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
    };
}

export function useIncomingNotificationPopups(options: {
    userId: string;
    isPanelOpen: boolean;
    enabled?: boolean;
}) {
    const { userId, isPanelOpen, enabled = true } = options;
    const notifications = useNotificationStore((s) => s.notifications);
    const isLoading = useNotificationStore((s) => s.isLoading);

    const [queue, setQueue] = useState<IncomingNotificationPopup[]>([]);
    const baselineReadyRef = useRef(false);
    const knownIdsRef = useRef(new Set<string>());
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

    useEffect(() => {
        return () => {
            for (const t of dismissTimersRef.current.values()) {
                window.clearTimeout(t);
            }
            dismissTimersRef.current.clear();
        };
    }, []);

    useEffect(() => {
        if (!userId) {
            baselineReadyRef.current = false;
            knownIdsRef.current = new Set();
            setQueue([]);
            return;
        }
        baselineReadyRef.current = false;
        knownIdsRef.current = new Set();
        setQueue([]);
    }, [userId]);

    useEffect(() => {
        if (!enabled || !areInAppNotificationsEnabled() || !userId) return;

        if (!baselineReadyRef.current) {
            if (isLoading) return;
            knownIdsRef.current = new Set(notifications.map((n) => n.id));
            baselineReadyRef.current = true;
            return;
        }

        if (isPanelOpen) {
            setQueue([]);
            for (const n of notifications) knownIdsRef.current.add(n.id);
            return;
        }

        const fresh = notifications.filter((n) => !n.isRead && !knownIdsRef.current.has(n.id));
        if (fresh.length === 0) return;

        for (const n of fresh) knownIdsRef.current.add(n.id);

        setQueue((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const merged = [...prev];
            for (const n of fresh) {
                if (existing.has(n.id)) continue;
                merged.unshift(toPopup(n));
            }
            return merged.slice(0, MAX_VISIBLE);
        });
    }, [enabled, isLoading, isPanelOpen, notifications, userId]);

    useEffect(() => {
        for (const item of queue) {
            if (!dismissTimersRef.current.has(item.id)) {
                scheduleDismiss(item.id);
            }
        }
        for (const id of [...dismissTimersRef.current.keys()]) {
            if (!queue.some((q) => q.id === id)) clearTimer(id);
        }
    }, [clearTimer, queue, scheduleDismiss]);

    return { queue, dismiss };
}

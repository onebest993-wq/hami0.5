/**
 * Frame-1 hydrate — قراءة sync فقط قبل كشف الإقلاع.
 *
 * شارات من القرص/الكاش المحلي — لا أصفار وهمية ثم قفزة (CLS).
 * لا ينتظر شبكة ولا spark bridge.
 */
import { peekBootSessionPeekSync, peekBootSessionUserIdSync } from '@/boot/peekBootSessionUserId';
import { hydrateProfileWarmCachePeekSync } from '@/app/services/profile/profileWarmCache';
import {
    hasStoredLocalNotifications,
    peekLocalNotifications,
    peekNotificationUnreadCount,
} from '@/app/infrastructure/notificationPeekLite';
import { peekHomeHubSecretaryAlertsCache } from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import {
    peekDashboardFrame1Snapshot,
    patchDashboardFrame1Snapshot,
} from '@/app/bootstrap/dashboardFrame1Snapshot';

export type Frame1HydrateSnapshot = {
    userId: string | null;
    unreadCount: number;
    forumUnreadCount: number;
    pendingFieldTasksCount: number;
    secretaryAlertCount: number;
    pinnedCount: number;
    urgentAlertsCount: number;
    secretaryAlerts: SecretaryAlert[];
    hydratedAtMs: number;
};

declare global {
    interface Window {
        __hamiFrame1Hydrate__?: Frame1HydrateSnapshot;
    }
}

let cached: Frame1HydrateSnapshot | null = null;

export function peekFrame1Hydrate(): Frame1HydrateSnapshot | null {
    if (cached) return cached;
    if (typeof window !== 'undefined' && window.__hamiFrame1Hydrate__) {
        return window.__hamiFrame1Hydrate__;
    }
    return null;
}

function resolveUnreadCount(userId: string | null, fallback: number): number {
    const uid = userId?.trim();
    if (!uid) return 0;
    const parsed = peekLocalNotifications(uid);
    if (parsed.length > 0) {
        return parsed.filter((n) => !n.isRead).length;
    }
    if (hasStoredLocalNotifications(uid)) {
        return fallback;
    }
    const live = peekNotificationUnreadCount(uid);
    return live > 0 ? live : fallback;
}

/** لقطة sync — آمنة للاستدعاء المتكرر قبل markBootRevealDone */
export function ensureFrame1HydrateSync(): Frame1HydrateSnapshot {
    const session = peekBootSessionPeekSync();
    const userId = session?.userId ?? peekBootSessionUserIdSync();
    if (userId) {
        hydrateProfileWarmCachePeekSync(userId, session?.userMetadata, userId);
    }
    const disk = peekDashboardFrame1Snapshot(userId);
    const ramSecretary = userId != null ? peekHomeHubSecretaryAlertsCache(userId) : null;
    const secretaryAlerts = ramSecretary ?? [];
    const secretaryAlertCount =
        secretaryAlerts.length > 0 ? secretaryAlerts.length : (disk?.secretaryAlertCount ?? 0);
    const unreadCount = resolveUnreadCount(userId, disk?.unreadCount ?? 0);
    const forumUnreadCount = disk?.forumUnreadCount ?? 0;
    const pendingFieldTasksCount = disk?.pendingFieldTasksCount ?? 0;
    const pinnedCount = disk?.pinnedCount ?? 0;
    const urgentAlertsCount = disk?.urgentAlertsCount ?? 0;

    const snapshot: Frame1HydrateSnapshot = {
        userId,
        unreadCount,
        forumUnreadCount,
        pendingFieldTasksCount,
        secretaryAlertCount,
        pinnedCount,
        urgentAlertsCount,
        secretaryAlerts,
        hydratedAtMs: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    };
    cached = snapshot;
    if (typeof window !== 'undefined') {
        window.__hamiFrame1Hydrate__ = snapshot;
    }
    if (userId) {
        patchDashboardFrame1Snapshot(userId, {
            unreadCount,
            secretaryAlertCount,
        });
    }
    return snapshot;
}

export function resetFrame1HydrateForTests(): void {
    cached = null;
    if (typeof window !== 'undefined') {
        delete window.__hamiFrame1Hydrate__;
    }
}

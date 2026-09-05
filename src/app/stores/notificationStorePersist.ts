import type { NotificationModel } from '@/app/infrastructure/notificationModel';
import { unreadCountOf } from '@/app/stores/notificationStoreList';

type OwnerSlice = {
    currentUserId: string | null;
    notifications: NotificationModel[];
};

export function isNotificationStoreOwnerMismatch(
    currentUserId: string | null,
    userId: string,
): boolean {
    return currentUserId != null && currentUserId !== userId;
}

export function persistLiveListIfSameUser(
    get: () => OwnerSlice,
    userId: string,
    save: (userId: string, list: NotificationModel[]) => Promise<unknown>,
): void {
    const state = get();
    if (state.currentUserId !== userId) return;
    void save(userId, state.notifications);
}

export function notificationListMembershipChanged(
    snapshot: readonly { id: string }[],
    latest: readonly { id: string }[],
): boolean {
    if (snapshot.length !== latest.length) return true;
    const ids = new Set(snapshot.map((n) => n.id));
    for (const n of latest) {
        if (!ids.has(n.id)) return true;
    }
    return false;
}

export function commitReadReconcileIfMembershipChanged(
    set: (next: { notifications: NotificationModel[]; unreadCount: number }) => void,
    save: (userId: string, list: NotificationModel[]) => Promise<unknown>,
    userId: string,
    snapshot: readonly { id: string }[],
    reconciled: NotificationModel[],
): void {
    if (!notificationListMembershipChanged(snapshot, reconciled)) return;
    set({ notifications: reconciled, unreadCount: unreadCountOf(reconciled) });
    void save(userId, reconciled);
}

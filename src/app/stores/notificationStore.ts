import { create } from 'zustand';
import {
    type NotificationModel,
    isActivityLogNotification,
    deriveNotificationCategory,
} from '@/app/infrastructure/notificationModel';
import { isIncomingNotification } from '@/app/services/notificationIncomingFilter';
import { capNotificationList } from '@/app/services/notifications/notificationLimits';
import {
    capMergedNotificationLists,
    notificationListsReferenceEqual,
} from '@/app/services/notifications/notificationMerge';
import { peekLocalNotifications, hasStoredLocalNotifications } from '@/app/infrastructure/notificationPeekLite';
import { isViteE2eHooksEnabled } from '@/app/utils/viteE2eHooks';
import { NOTIFICATION_PERF_BUDGET } from '@/app/services/notifications/notificationPerfBudget';
import { emitInboxNotificationArrived } from '@/app/runtime/inboxNotificationArrival';
import {
    applyUpsertsToList,
    normalizeNotification,
    stripInvalidNotifications,
    unreadCountOf,
} from '@/app/stores/notificationStoreList';
import {
    applyE2eInboxSeedToStore,
    installNotificationStoreE2eHooks,
    type E2eInboxSeedItem,
} from '@/app/stores/notificationStoreE2e';

type NotificationRepositoryModule = typeof import('@/app/infrastructure/NotificationRepository');

let notificationRepositoryPromise: Promise<NotificationRepositoryModule> | null = null;

function loadNotificationRepository(): Promise<NotificationRepositoryModule> {
    if (!notificationRepositoryPromise) {
        notificationRepositoryPromise = import('@/app/infrastructure/NotificationRepository');
    }
    return notificationRepositoryPromise;
}

interface NotificationState {
    notifications: NotificationModel[];
    unreadCount: number;
    isLoading: boolean;
    currentUserId: string | null;
    hasHydratedOnce: boolean;
    lastFetchedAt: number;

    fetchNotifications: (userId: string) => Promise<void>;
    hydrateFromLocalPeek: (userId: string) => void;
    markAsRead: (
        userId: string,
        notificationId: string,
        options?: { skipForumPersist?: boolean },
    ) => Promise<void>;
    markAllAsRead: (userId: string, options?: { skipForumPersist?: boolean }) => Promise<void>;
    markForumNotificationsRead: (
        userId: string,
        options?: { skipForumPersist?: boolean },
    ) => Promise<void>;
    removeNotification: (notificationId: string) => void;
    addNotification: (notification: NotificationModel) => void;
    upsertNotification: (notification: NotificationModel) => void;
    upsertNotifications: (notifications: NotificationModel[]) => void;
    setUserId: (userId: string | null) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    currentUserId: null,
    hasHydratedOnce: false,
    lastFetchedAt: 0,

    setUserId: (userId) => {
        const prev = get().currentUserId;
        if (prev === userId) return;
        set({
            currentUserId: userId,
            notifications: [],
            unreadCount: 0,
            isLoading: false,
            hasHydratedOnce: false,
            lastFetchedAt: 0,
        });
    },

    hydrateFromLocalPeek: (userId: string) => {
        const uid = userId.trim();
        if (!uid) return;
        const state = get();
        if (state.currentUserId === uid && state.hasHydratedOnce) return;

        const list = stripInvalidNotifications(capNotificationList(peekLocalNotifications(uid)));
        const unread = unreadCountOf(list);
        /*
         * المفتاح مشفَّر — قائمة فارغة من peek غامضة: فراغ حقيقي، أم بيانات
         * موجودة وذاكرة الفكّ باردة (أول لمسة لهذا المفتاح في الجلسة)؟
         * hasStoredLocalNotifications تفصل الحالتين عبر hasItemSync (فحص وجود
         * على القرص لا فكّ). في الحالة الغامضة لا نُثبّت hasHydratedOnce، فتبقى
         * شاشة التحميل (لا حالة خالية) — وfetchNotifications اللاحقة تُصحّح
         * فوراً عبر مسارها غير المتزامن الذي يقرأ ذات المفتاح بلا اعتماد على
         * التسخين.
         *
         * إن كانت الذاكرة أصلاً تحمل وارد هذا المستخدم، لا تُمسَح بـ peek بارد —
         * وإلا ومضة فراغ (أو بقاء فراغ إن فشل الجلب) فوق بيانات صحيحة.
         */
        const ambiguousEmpty = list.length === 0 && hasStoredLocalNotifications(uid);
        if (ambiguousEmpty) {
            const keepMemory = state.currentUserId === uid && state.notifications.length > 0;
            set({
                currentUserId: uid,
                hasHydratedOnce: false,
                isLoading: true,
                ...(keepMemory ? {} : { notifications: [], unreadCount: 0 }),
            });
            return;
        }
        set({
            currentUserId: uid,
            notifications: list,
            unreadCount: unread,
            hasHydratedOnce: true,
            isLoading: false,
        });
    },

    fetchNotifications: async (userId: string) => {
        const prevUserId = get().currentUserId;
        const sameUser = prevUserId === userId;
        const hadCached = sameUser && get().notifications.length > 0;
        const hasHydratedOnce = sameUser && get().hasHydratedOnce;
        const fetchedAt = sameUser ? get().lastFetchedAt : 0;
        if (
            sameUser &&
            fetchedAt > 0 &&
            Date.now() - fetchedAt < NOTIFICATION_PERF_BUDGET.fetchFreshWindowMs &&
            (hadCached || hasHydratedOnce)
        ) {
            return;
        }
        if (!sameUser) {
            set({ notifications: [], unreadCount: 0, currentUserId: userId, hasHydratedOnce: false, lastFetchedAt: 0 });
        } else {
            set({ currentUserId: userId });
        }
        if (!hadCached && !hasHydratedOnce) {
            set({ isLoading: true });
        }
        const { NotificationRepository } = await loadNotificationRepository();
        const raw = await NotificationRepository.fetchNotifications(userId);
        const list = stripInvalidNotifications(raw);

        if (list.length !== raw.length) {
            void NotificationRepository.replaceAllNotifications(userId, list);
        }

        const current = get().notifications;
        const merged = stripInvalidNotifications(capMergedNotificationLists(list, current));
        const capped = capNotificationList(merged);
        const finalList = notificationListsReferenceEqual(capped, current) ? current : capped;
        const unread = unreadCountOf(finalList);

        set({
            notifications: finalList,
            unreadCount: unread,
            isLoading: false,
            hasHydratedOnce: true,
            lastFetchedAt: Date.now(),
        });
    },

    markAsRead: async (userId: string, notificationId: string, options?: { skipForumPersist?: boolean }) => {
        const { notifications } = get();
        const target = notifications.find((n) => n.id === notificationId);
        if (!target) return;

        const updatedList = notifications.map((n) =>
            n.id === notificationId ? { ...n, isRead: true } : n,
        );
        const unread = unreadCountOf(updatedList);

        set({ notifications: updatedList, unreadCount: unread });

        const { NotificationRepository } = await loadNotificationRepository();
        await NotificationRepository.markAsRead(userId, notificationId, updatedList);

        if (!options?.skipForumPersist && deriveNotificationCategory(target) === 'forum') {
            const { syncShellReadToForum } = await import(
                '@/app/services/notifications/notificationReadSync'
            );
            void syncShellReadToForum(userId, notificationId);
        }
    },

    markForumNotificationsRead: async (userId: string, options?: { skipForumPersist?: boolean }) => {
        const { notifications } = get();
        const updatedList = notifications.map((n) =>
            deriveNotificationCategory(n) === 'forum' ? { ...n, isRead: true } : n,
        );
        const unread = unreadCountOf(updatedList);

        set({ notifications: updatedList, unreadCount: unread });
        const { NotificationRepository } = await loadNotificationRepository();
        await NotificationRepository.saveNotifications(userId, updatedList);

        if (!options?.skipForumPersist) {
            const { syncShellMarkAllReadToForum } = await import(
                '@/app/services/notifications/notificationReadSync'
            );
            void syncShellMarkAllReadToForum(userId);
        }
    },

    markAllAsRead: async (userId: string, options?: { skipForumPersist?: boolean }) => {
        const { notifications } = get();

        const updatedList = notifications.map((n) => ({ ...n, isRead: true }));

        set({ notifications: updatedList, unreadCount: 0 });

        const { NotificationRepository } = await loadNotificationRepository();
        await NotificationRepository.markAllAsRead(userId, updatedList);

        if (!options?.skipForumPersist) {
            const hasForum = notifications.some((n) => deriveNotificationCategory(n) === 'forum');
            if (hasForum) {
                const { syncShellMarkAllReadToForum } = await import(
                    '@/app/services/notifications/notificationReadSync'
                );
                void syncShellMarkAllReadToForum(userId);
            }
        }
    },

    removeNotification: (notificationId: string) => {
        const { notifications, currentUserId } = get();
        const updated = notifications.filter((n) => n.id !== notificationId);
        if (updated.length === notifications.length) return;

        set({
            notifications: updated,
            unreadCount: unreadCountOf(updated),
        });

        if (currentUserId) {
            void loadNotificationRepository().then(({ NotificationRepository }) => {
                void NotificationRepository.saveNotifications(currentUserId, updated);
            });
        }
    },

    addNotification: (notification: NotificationModel) => {
        if (isActivityLogNotification(notification)) return;
        if (!isIncomingNotification(notification)) return;
        const normalized = normalizeNotification(notification);
        if (!normalized) return;
        const { notifications, currentUserId } = get();
        if (notifications.some((n) => n.id === normalized.id)) return;
        const updated = [normalized, ...notifications];
        const capped = capNotificationList(updated);
        set({
            notifications: capped,
            unreadCount: unreadCountOf(capped),
        });

        emitInboxNotificationArrived(normalized);

        if (currentUserId) {
            void loadNotificationRepository().then(({ NotificationRepository }) => {
                void NotificationRepository.addNotification(currentUserId, normalized).then(
                    (authoritative) => {
                        if (!authoritative) return;
                        const state = get();
                        let list = state.notifications;
                        if (authoritative.id !== normalized.id) {
                            list = list.filter((n) => n.id !== normalized.id);
                        }
                        const next = applyUpsertsToList(list, [authoritative]);
                        set({
                            notifications: next,
                            unreadCount: unreadCountOf(next),
                        });
                    },
                );
            });
        }
    },

    upsertNotification: (notification: NotificationModel) => {
        get().upsertNotifications([notification]);
    },

    upsertNotifications: (incoming: NotificationModel[]) => {
        if (incoming.length === 0) return;
        const { notifications, currentUserId } = get();
        const capped = applyUpsertsToList(notifications, incoming);
        if (capped === notifications) return;

        set({
            notifications: capped,
            unreadCount: unreadCountOf(capped),
        });

        if (currentUserId) {
            void loadNotificationRepository().then(({ NotificationRepository }) => {
                void NotificationRepository.saveNotifications(currentUserId, capped);
            });
        }
    },
}));

export type { E2eInboxSeedItem };

export function applyE2eInboxSeed(items: E2eInboxSeedItem[], userId?: string | null): number {
    return applyE2eInboxSeedToStore(useNotificationStore, items, userId);
}

if (isViteE2eHooksEnabled() && typeof window !== 'undefined') {
    installNotificationStoreE2eHooks(useNotificationStore);
}

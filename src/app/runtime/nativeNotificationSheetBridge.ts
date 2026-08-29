import {
    deriveNotificationCategory,
    type NotificationModel,
} from '@/app/infrastructure/notificationModel';
import {
    isForumNotification,
    isSystemNotification,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationFilters';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { applyLawyerSettingsPatchExternal } from '@/app/context/lawyerSettings/lawyerSettingsPersistence';
import {
    NOTIFICATION_CHANNEL_KEYS,
    NOTIFICATION_INBOX_CHANNEL_KEYS,
    NOTIFICATION_INBOX_CHANNEL_LABELS,
    normalizeNotificationSettings,
    patchNotificationSettings,
    sessionMuteUntilMs,
    sessionMuteUntilTomorrowMorning,
    type NotificationChannelKey,
} from '@/app/services/settings/notificationSettings';
import { isSessionMuted } from '@/app/services/notifications/notificationSessionMute';
import { stopHamiLegalReminderAlarm } from '@/app/services/calendar/calendarReminderAlarmSound';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import {
    isNotificationNavTarget,
    sanitizeNotificationActionPayload,
} from '@/app/services/notifications/notificationNavigateSecurity';
import type {
    NativeNotificationSheetItem,
    NativeNotificationSheetSettingsPatch,
    PresentNativeNotificationSheetOptions,
} from '@/plugins/hami-notification-sheet/definitions';

export function isNativeNotificationSheetEnabled(): boolean {
    return import.meta.env.VITE_NATIVE_NOTIFICATION_SHEET === 'true';
}

/** تسخين مخزون الإشعارات قبل بناء payload الأصلي. */
export async function primeNativeNotificationSheetData(userId: string): Promise<void> {
    const uid = userId.trim();
    if (!uid) return;

    const { warmNotificationsOnOpen } = await import(
        '@/app/hooks/lawyerDashboard/notificationIntentWarm'
    );
    warmNotificationsOnOpen(uid);

    try {
        const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
        await SecureStoreService.getItem(`hami:notifications:v1:${uid}`);
    } catch {
        /* ignore */
    }

    useNotificationStore.getState().hydrateFromLocalPeek(uid);
}

function toNativeTab(notification: NotificationModel): 'forum' | 'system' {
    return isForumNotification(notification) ? 'forum' : 'system';
}

export function buildNativeNotificationSheetPayload(
    userId: string | null,
): PresentNativeNotificationSheetOptions | null {
    const uid = userId?.trim();
    if (!uid) return null;

    const store = useNotificationStore.getState();
    const notifications = store.notifications
        .filter((n) => isForumNotification(n) || isSystemNotification(n))
        .map(
            (n): NativeNotificationSheetItem => ({
                id: n.id,
                title: n.title,
                message: n.message,
                type: n.type,
                isRead: n.isRead,
                createdAt: n.createdAt,
                tab: toNativeTab(n),
            }),
        );

    const forumCount = notifications.filter((n) => n.tab === 'forum').length;
    const systemCount = notifications.filter((n) => n.tab === 'system').length;
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    const settings = normalizeNotificationSettings(getLawyerSettingsSnapshot().notifications);

    const channels: PresentNativeNotificationSheetOptions['channels'] = {};
    const channelLabels: Record<string, string> = {};
    for (const key of NOTIFICATION_INBOX_CHANNEL_KEYS) {
        channels[key] = { ...settings.channels[key] };
        channelLabels[key] = NOTIFICATION_INBOX_CHANNEL_LABELS[key];
    }

    return {
        route: 'inbox',
        activeTab: 'forum',
        unreadCount,
        forumCount,
        systemCount,
        sessionMuted: isSessionMuted(getLawyerSettingsSnapshot()),
        notifications,
        channels,
        channelLabels,
        soundMaster: settings.soundMaster,
        vibrateMaster: settings.vibrateMaster,
    };
}

export async function tryPresentNativeNotificationSheet(
    userId: string | null,
): Promise<boolean> {
    if (!isNativeNotificationSheetEnabled()) return false;

    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return false;
    if (!Capacitor.isPluginAvailable('HamiNotificationSheet')) return false;

    const uid = userId?.trim();
    if (!uid) return false;

    await primeNativeNotificationSheetData(uid);

    const payload = buildNativeNotificationSheetPayload(uid);
    if (!payload) return false;

    const { HamiNotificationSheet } = await import('@/plugins/hami-notification-sheet');
    try {
        await HamiNotificationSheet.present(payload);
        return true;
    } catch {
        return false;
    }
}

export function applyNativeNotificationSheetSettingsPatch(
    patch: NativeNotificationSheetSettingsPatch,
): void {
    applyLawyerSettingsPatchExternal((prev) => {
        let notifications = normalizeNotificationSettings(prev.notifications);

        if (patch.sessionMuteClear) {
            stopHamiLegalReminderAlarm();
            notifications = patchNotificationSettings(notifications, { sessionMutedUntil: null });
        } else if (typeof patch.sessionMuteUntil === 'number' && Number.isFinite(patch.sessionMuteUntil)) {
            stopHamiLegalReminderAlarm();
            notifications = patchNotificationSettings(notifications, {
                sessionMutedUntil: patch.sessionMuteUntil,
            });
        } else if (typeof patch.sessionMuteMinutes === 'number') {
            stopHamiLegalReminderAlarm();
            notifications = patchNotificationSettings(notifications, {
                sessionMutedUntil: sessionMuteUntilMs(patch.sessionMuteMinutes),
            });
        } else if (patch.sessionMuteUntilMorning) {
            stopHamiLegalReminderAlarm();
            notifications = patchNotificationSettings(notifications, {
                sessionMutedUntil: sessionMuteUntilTomorrowMorning(),
            });
        }

        if (typeof patch.soundMaster === 'boolean') {
            notifications = patchNotificationSettings(notifications, {
                soundMaster: patch.soundMaster,
            });
        }
        if (typeof patch.vibrateMaster === 'boolean') {
            notifications = patchNotificationSettings(notifications, {
                vibrateMaster: patch.vibrateMaster,
            });
        }

        if (patch.channel) {
            const channel = patch.channel as NotificationChannelKey;
            if (NOTIFICATION_CHANNEL_KEYS.includes(channel)) {
                const channelPatch: Partial<(typeof notifications.channels)[NotificationChannelKey]> =
                    {};
                if (typeof patch.sound === 'boolean') channelPatch.sound = patch.sound;
                if (typeof patch.push === 'boolean') channelPatch.push = patch.push;
                if (typeof patch.inApp === 'boolean') channelPatch.inApp = patch.inApp;
                if (typeof patch.enabled === 'boolean') channelPatch.enabled = patch.enabled;
                notifications = patchNotificationSettings(notifications, {
                    channel,
                    channelPatch,
                });
            }
        }

        return { ...prev, notifications };
    });
}

export async function handleNativeNotificationSheetTap(
    userId: string | null,
    id: string,
    onNavigate: (path: string, payload: Record<string, unknown>) => void,
): Promise<void> {
    const uid = userId?.trim();
    if (!uid) return;

    const safeId = sanitizeNotificationActionPayload({ notificationId: id }).notificationId;
    const notificationId = typeof safeId === 'string' ? safeId : '';
    if (!notificationId) return;

    const notification = useNotificationStore.getState().notifications.find((n) => n.id === notificationId);
    if (!notification) return;

    if (!notification.isRead) {
        await useNotificationStore.getState().markAsRead(uid, notification.id);
    }

    const cat = deriveNotificationCategory(notification);
    const payload = sanitizeNotificationActionPayload(notification.actionPayload ?? {});
    let path: string | null = null;
    switch (cat) {
        case 'forum':
            path = 'community';
            break;
        case 'document':
            path = 'vault';
            break;
        case 'execution':
            path = payload.caseId ? 'case_details' : 'execution_home';
            break;
        case 'civil':
        case 'criminal':
            path = payload.caseId ? 'case_details' : 'lawsuit_home';
            break;
        case 'ai':
            if (payload.caseId) path = 'case_details';
            break;
        case 'task':
            path = 'schedule';
            break;
        default:
            break;
    }
    if (path && isNotificationNavTarget(path)) onNavigate(path, payload);
}

let bridgeInstallToken = 0;

export function installNativeNotificationSheetBridge(input: {
    userId: string | null;
    onNavigate: (path: string, payload: Record<string, unknown>) => void;
}): () => void {
    if (!isNativeNotificationSheetEnabled()) return () => undefined;

    const token = ++bridgeInstallToken;
    let cancelled = false;
    const handles: Array<{ remove: () => Promise<void> }> = [];

    void (async () => {
        const { Capacitor } = await import('@capacitor/core');
        if (cancelled || token !== bridgeInstallToken) return;
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return;
        if (!Capacitor.isPluginAvailable('HamiNotificationSheet')) return;

        const { HamiNotificationSheet } = await import('@/plugins/hami-notification-sheet');
        if (cancelled || token !== bridgeInstallToken) return;

        handles.push(
            await HamiNotificationSheet.addListener('settingsPatch', (patch) => {
                applyNativeNotificationSheetSettingsPatch(patch);
            }),
        );
        handles.push(
            await HamiNotificationSheet.addListener('notificationTapped', ({ id }) => {
                void handleNativeNotificationSheetTap(input.userId, id, input.onNavigate);
            }),
        );
    })();

    return () => {
        if (token !== bridgeInstallToken) return;
        cancelled = true;
        void Promise.all(handles.map((h) => h.remove()));
        handles.length = 0;
    };
}

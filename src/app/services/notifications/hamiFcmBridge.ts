/**
 * FCM — تسجيل الرمز واستقبال push عند إغلاق التطبيق (Android/iOS).
 * يتطلب google-services.json + FCM_SERVICE_ACCOUNT_JSON على الخادم.
 */
import { debug } from '@/app/utils/debug';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT } from '@/app/services/notifications/notificationOsTapEvents';
import { playNotificationArrivalCue } from '@/app/services/notifications/notificationArrivalSound';
import type { NotificationInboxChannelKey } from '@/app/services/settings/notificationSettings';
import { isNotificationInboxChannel } from '@/app/services/settings/notificationSettings';

let fcmInitialized = false;
let fcmListenersBound = false;
let lastRegisteredToken: string | null = null;
let fcmUserId: string | null = null;

function channelFromFcmData(data: Record<string, unknown>): NotificationInboxChannelKey {
    const raw = typeof data.channel === 'string' ? data.channel.trim() : '';
    if (isNotificationInboxChannel(raw)) return raw;
    const category = typeof data.category === 'string' ? data.category.trim() : '';
    if (category === 'forum') return 'community';
    return 'secretary';
}

function refreshInboxAfterPush(): void {
    const uid = fcmUserId?.trim();
    if (!uid) return;
    void import('@/app/services/notifications/notificationBackgroundSync')
        .then((m) =>
            m.refreshNotificationShellBadge(uid, {
                includeLegacyPurge: false,
            }),
        )
        .catch(() => undefined);
}

async function registerTokenWithServer(token: string, platform: 'android' | 'ios'): Promise<void> {
    if (lastRegisteredToken === token) return;
    await SecureAPIClient.fetchSecure('/api/notifications/fcm-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, platform }),
    });
    lastRegisteredToken = token;
    debug.log('[HamiFcmBridge] token registered');
}

async function loadPushPlugin() {
    if (!isCapacitorNativePlatform()) return null;
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        return PushNotifications;
    } catch (error) {
        debug.warn('[HamiFcmBridge] push plugin unavailable:', error);
        return null;
    }
}

function bindFcmListeners(
    PushNotifications: typeof import('@capacitor/push-notifications').PushNotifications,
    platform: 'android' | 'ios',
): void {
    if (fcmListenersBound) return;
    fcmListenersBound = true;

    void PushNotifications.addListener('registration', (token) => {
        const value = token.value?.trim();
        if (!value) return;
        void registerTokenWithServer(value, platform).catch((err) => {
            debug.warn('[HamiFcmBridge] register failed:', err);
        });
    });

    void PushNotifications.addListener('registrationError', (err) => {
        debug.warn('[HamiFcmBridge] registrationError:', err);
    });

    void PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const data = (notification.data ?? {}) as Record<string, unknown>;
        const channel = channelFromFcmData(data);
        void playNotificationArrivalCue(channel).catch(() => undefined);
        refreshInboxAfterPush();
    });

    void PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const data = (action.notification.data ?? {}) as Record<string, unknown>;
        window.dispatchEvent(
            new CustomEvent(HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT, {
                detail: { data, extra: data },
            }),
        );
    });
}

export async function initializeHamiFcmBridge(userId: string | null): Promise<void> {
    if (fcmInitialized || !userId?.trim()) return;
    fcmUserId = userId.trim();

    const PushNotifications = await loadPushPlugin();
    if (!PushNotifications) return;

    const { Capacitor } = await import('@capacitor/core');
    const platform = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';

    try {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== 'granted') {
            debug.log('[HamiFcmBridge] push permission not granted');
            return;
        }

        bindFcmListeners(PushNotifications, platform);
        await PushNotifications.register();
        fcmInitialized = true;
        debug.log('[HamiFcmBridge] FCM register invoked');
    } catch (error) {
        debug.warn('[HamiFcmBridge] init failed:', error);
    }
}

export function resetHamiFcmBridgeForTests(): void {
    fcmInitialized = false;
    fcmListenersBound = false;
    lastRegisteredToken = null;
    fcmUserId = null;
}

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('notifications security close honesty', () => {
    it('التنقّل مسموح بقائمة، والكاش المحلّي مشفّر، ولا مسار مراسلة موكل', () => {
        const nav = read('src/app/services/notifications/notificationNavigateSecurity.ts');
        expect(nav).toContain("'community'");
        expect(nav).toContain("'scan_document'");
        expect(nav).toContain("'schedule'");
        expect(nav).not.toContain("'javascript:'");
        expect(nav).toContain('sanitizeNotificationEntityId');
        expect(nav).toContain('SCHEME_ID');
        const keys = read('src/app/services/secureStorageKeys.ts');
        expect(keys).toContain("'hami:notifications:v1:'");
        const card = read('src/app/components/lawyer/NotificationPanel/components/NotificationCard.tsx');
        expect(card).not.toContain('مراسلة الموكل');
        expect(card).not.toContain('onClientRequest');
        expect(card).not.toContain('wa.me');
        expect(
            existsSync(
                join(root, 'src/app/components/lawyer/NotificationPanel/hooks/useNotificationClientRequest.ts'),
            ),
        ).toBe(false);
        expect(
            existsSync(join(root, 'src/app/services/notifications/notificationClientRequestSecurity.ts')),
        ).toBe(false);
    });

    it('نقر إشعار نظام التشغيل مربوط بالجسر ومكدس Escape لا يتجاوز الحوار', () => {
        const bridge = read('src/app/services/notifications/bindNotificationOsTapBridge.ts');
        expect(bridge).toContain('HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT');
        expect(bridge).toContain('resolveOsNotificationTap');
        expect(bridge).toContain('event.origin !== window.location.origin');
        const escape = read(
            'src/app/components/lawyer/NotificationPanel/notificationEscapeStack.ts',
        );
        expect(escape).toContain("if (snapshot.smartDialogOpen) return 'dismiss-dialog'");
        expect(escape).toContain("if (snapshot.alertControlsOpen) return 'back-to-inbox'");
        expect(existsSync(join(root, 'src/app/services/notifications/notificationOsTapRouting.ts'))).toBe(
            true,
        );
        const extract = read('src/app/services/notifications/osTap/notificationOsTapExtract.ts');
        expect(extract).toContain('MAX_OS_NOTIFY_QUERY_CHARS');
        expect(extract).toContain('sanitizeNotificationFocusId');
    });

    it('مسارات API مصادق عليها بلا تسريب err.message، والدمج يصفّر السجلات', () => {
        const auth = read('src/app/api/notifications/_auth.ts');
        expect(auth).toContain('requireWifeUser');
        expect(auth).toContain('NOTIFICATIONS_API_INTERNAL_ERROR');
        for (const rel of [
            'src/app/api/notifications/append/route.ts',
            'src/app/api/notifications/merge/route.ts',
            'src/app/api/notifications/wipe/route.ts',
            'src/app/api/notifications/list/route.ts',
            'src/app/api/notifications/health/route.ts',
            'src/app/api/notifications/fcm-register/route.ts',
            'src/app/api/notifications/read-state/route.ts',
        ]) {
            const src = read(rel);
            expect(src).toContain('requireNotificationsAuth');
            expect(src).toContain('NOTIFICATIONS_API_INTERNAL_ERROR');
            expect(src).not.toContain('err.message');
        }
        const merge = read('src/app/api/notifications/merge/route.ts');
        expect(merge).toContain('sanitizeNotificationModelForPersist');
        expect(merge).toContain('NOTIFICATION_LIST_CAP');
        expect(merge).toContain("n.type !== 'system_alert'");
        expect(merge).toContain("n.category !== 'system'");
        const append = read('src/app/api/notifications/append/route.ts');
        expect(append).toContain('sanitizeNotificationActionPayload');
        expect(append).toContain('MAX_NOTIFICATION_TITLE_LEN');
        expect(append).toContain('CLIENT_ALLOWED_TYPES');
        expect(append).toContain("error: 'نوع إشعار غير مسموح من العميل'");
        expect(append).not.toContain("payload.type : 'system_alert'");
        const health = read('src/app/api/notifications/health/route.ts');
        expect(health).not.toContain('userId,');
        const fcm = read('src/app/api/notifications/fcm-register/route.ts');
        expect(fcm).toContain('isAllowedFcmToken');
    });

    it('لا XSS عبر innerHTML ديناميكي أو تركيز بطاقة، والعامل يرفض أيقونة خارج الأصل', () => {
        const panelRoot = 'src/app/components/lawyer/NotificationPanel';
        expect(read(`${panelRoot}/components/IncomingNotificationPopups.tsx`)).not.toContain(
            'dangerouslySetInnerHTML',
        );
        expect(read(`${panelRoot}/NotificationShell.tsx`)).not.toContain('dangerouslySetInnerHTML');
        expect(read(`${panelRoot}/NotificationShell.tsx`)).toContain('inertProps(!isOpen)');
        expect(read(`${panelRoot}/NotificationShell.tsx`)).toContain('data-hami-overlay-safe');
        const paint = read('src/app/runtime/notificationInstantPaintBridge.ts');
        expect(paint).toContain('bridge.innerHTML');
        expect(paint).not.toMatch(/bridge\.innerHTML\s*=\s*[^\n]*\+/);
        const focus = read(`${panelRoot}/hooks/useNotificationPanelFocus.ts`);
        expect(focus).toContain('CSS.escape(id)');
        const sw = read('public/sw.js');
        expect(sw).toContain('asSafePushPayload');
        expect(sw).toContain('sameOriginSwAsset');
        expect(sw).toContain('clipOsNotifyDetail');
        expect(sw).toContain("url.search.length <= 4100");
        const store = read('src/app/stores/notificationStore.ts');
        expect(store).toContain('isViteE2eHooksEnabled');
        const share = read(`${panelRoot}/hooks/useCaseSharePanel.ts`);
        expect(share).toContain('share.recipientId !== userId');
        const forumIntent = read('src/app/runtime/forumOpenIntent.ts');
        expect(forumIntent).toContain('sanitizeNotificationEntityId');
    });

    it('قنوات أندرويد وشحن FCM يخفيان النص على شاشة القفل الآمنة', () => {
        const channels = read('src/app/services/notifications/native/nativeNotificationChannels.ts');
        expect(channels).toContain('HAMI_NATIVE_LOCKSCREEN_VISIBILITY');
        expect(channels).toContain('hami-community-v3');
        const plugin = read('src/app/services/notifications/bridge/hamiBridgeNativePlugin.ts');
        expect(plugin).toContain('HAMI_NATIVE_LOCKSCREEN_VISIBILITY');
        expect(plugin).not.toContain('visibility: 1');
        expect(plugin).toContain('nativeHamiChannelIdsToDelete');
        expect(plugin).toContain('listChannels');
        expect(plugin).toContain('removeAllDeliveredNotifications');
        expect(plugin).toContain('HAMI_NATIVE_LOCKSCREEN_GEN_STORAGE_KEY');
        const migrate = read(
            'src/app/services/notifications/native/nativeChannelLockscreenMigrate.ts',
        );
        expect(migrate).toContain('HAMI_NATIVE_LOCKSCREEN_CHANNEL_GEN');
        expect(migrate).toContain('...listedHami, ...current');
        const send = read('src/app/services/notifications/fcm/fcmServerSend.server.ts');
        expect(send).toContain("visibility: 'PRIVATE'");
        expect(send).toContain('isNotificationNavTarget');
        const dispatch = read('src/app/services/notifications/fcm/fcmInboxDispatch.server.ts');
        expect(dispatch).toContain('sanitizeNotificationActionPayload');
        expect(dispatch).not.toContain('payload.path');
        const owned = read('src/app/services/notifications/notificationOwnedNavigate.ts');
        expect(owned).toContain('inboxPostIds.has(postId)');
        expect(owned).not.toContain('archive');
        const routing = read('src/app/hooks/useLawyerDashboardNavigation.ts');
        expect(routing).toContain('resolveNotificationOwnedNavigate');
        expect(routing).not.toContain('جاري فتح الأرشيف');
        const sheet = read(
            'android/app/src/main/java/iq/hami/legal/notificationsheet/HamiNotificationSheetActivity.kt',
        );
        expect(sheet).toContain('FLAG_SECURE');
        const schedule = read('src/app/services/notifications/bridge/hamiBridgeSchedule.ts');
        expect(schedule).toContain('sanitizeNotificationActionPayload(item.extra)');
        expect(schedule).toContain('HAMI_NATIVE_LOCKSCREEN_VISIBILITY');
    });
});

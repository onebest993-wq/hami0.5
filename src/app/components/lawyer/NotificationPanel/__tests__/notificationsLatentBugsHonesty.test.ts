import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('علل الإشعارات الخفية — لا تعود بعد الإصلاح', () => {
    it('الجلب لا يكتب وارداً بعد تبديل الحساب', () => {
        const store = read('src/app/stores/notificationStore.ts');
        expect(store).toContain('if (get().currentUserId !== userId) return;');
        expect(store).toContain('if (state.currentUserId !== currentUserId) return;');
        expect(store).toContain('snapshotIds.has(n.id)');
    });

    it('التركيز لا يُسقط المعرّف قبل ظهور البطاقة', () => {
        const focus = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelFocus.ts',
        );
        expect(focus).toContain('highlightNotificationCard');
        expect(focus).toContain('NOTIFICATION_FOCUS_RETRY_MS');
        expect(focus).not.toContain('setTimeout(() => {');
        const svc = read('src/app/services/notifications/notificationPanelFocus.ts');
        expect(svc).toContain('NOTIFICATION_FOCUS_RETRY_MS = 2_000');
        expect(svc).toContain('highlightNotificationCard');
    });

    it('مسح المستند زر مستقل داخل بطاقة role=button', () => {
        const card = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationCard.tsx',
        );
        expect(card).toContain('role="button"');
        expect(card).toContain('onPointerDown={stopScanBubble}');
        expect(card).not.toMatch(/<button[\s\S]*onClick=\{\(\) => onTap\(notification\)\}/);
        expect(card).toContain('event.target !== event.currentTarget');
    });

    it('نافذة القائمة لا تُصفَّر عند وصول عنصر جديد', () => {
        const windowHook = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationListWindow.ts',
        );
        expect(windowHook).not.toContain('const signature =');
        expect(windowHook).not.toContain('setRequested(NOTIFICATION_LIST_RENDER_BATCH)');
        expect(windowHook).toContain('NOTIFICATION_LIST_RENDER_BATCH');
    });

    it('كتم الموعد محلي، وتحديد الكل من وارد الصندوق، والكيبورد داخل التمرير', () => {
        const mute = read('src/app/services/settings/notificationSettings.ts');
        expect(mute).toContain('Number(match[2]) - 1');
        expect(mute).not.toContain('new Date(trimmed).getTime()');

        const inbox = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationHeaderInbox.tsx',
        );
        expect(inbox).toContain('inboxUnreadCount > 0');
        const panel = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel.ts',
        );
        expect(panel).toContain('inboxUnreadCount: unreadCount');

        const keyboard = read(
            'src/app/components/lawyer/NotificationPanel/utils/notificationPanelKeyboardLayout.ts',
        );
        expect(keyboard).toContain('.hami-notif-scroll');
        expect(keyboard).toContain('scroller.scrollTop');
        expect(keyboard).not.toContain('active.scrollIntoView');
    });

    it('الجسر يُزال عند انتهاء المحاولات، والمنبثق لا يُصفّ والتبويب مخفي', () => {
        const bridge = read('src/app/runtime/notificationInstantPaintBridge.ts');
        expect(bridge).toContain('if (++ticks > 120)');
        expect(bridge).toContain('removeNotificationInstantBridge()');
        expect(bridge).not.toContain('if (++ticks > 120) return;');

        const popups = read('src/app/hooks/lawyerDashboard/useIncomingNotificationPopups.ts');
        expect(popups).toContain("document.visibilityState === 'hidden'");
        expect(popups).toContain('if (hidden) return;');

        expect(
            existsSync(
                join(root, 'src/app/services/notifications/__tests__/notificationPanelFocus.test.ts'),
            ),
        ).toBe(true);
    });

    it('هدوء يومي وكتم لمرة واحدة ظاهران معاً — بلا تبويب يُخفي أحدهما', () => {
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/NotificationPanel/components/NotificationAlertDndSegments.tsx',
                ),
            ),
        ).toBe(false);
        expect(
            existsSync(
                join(
                    root,
                    'src/app/components/lawyer/NotificationPanel/components/notificationAlertDndTypes.ts',
                ),
            ),
        ).toBe(false);
        const dnd = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationAlertDndPanel.tsx',
        );
        expect(dnd).not.toContain('NotificationAlertDndSegments');
        expect(dnd).not.toContain('onModeChange');
        expect(dnd).not.toContain('role="tabpanel"');
        expect(dnd).toContain('NotificationAlertQuietHoursFields');
        expect(dnd).toContain('NotificationAlertOnceMuteFields');
        const hook = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationDndControls.ts',
        );
        expect(hook).toContain('applyLawyerSettingsPatchExternal');
        expect(hook).not.toContain('useLawyerSettingsActions');
        expect(hook).not.toContain('dndMode');
        const quiet = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationAlertQuietHoursFields.tsx',
        );
        expect(quiet).toContain('هدوء يومي');
        expect(quiet).toContain('ليس كتماً فورياً');
        const once = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationAlertOnceMuteFields.tsx',
        );
        expect(once).toContain('كتم لمرة واحدة');
    });
});

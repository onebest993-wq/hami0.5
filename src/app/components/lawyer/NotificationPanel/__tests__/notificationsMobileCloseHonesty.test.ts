import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('notifications mobile close honesty', () => {
    it('اللوحة تقفل التمرير وتحترم safe-area ولوحة المفاتيح واللمس 44px', () => {
        const panel = read('src/app/components/lawyer/NotificationPanel/index.tsx');
        expect(panel).toContain('useBodyScrollLock(isOpen)');
        expect(panel).toContain('useNotificationLayeredEscape');
        expect(panel).toContain('ignoreInlineStartEdgePx');
        expect(panel).toContain('OVERLAY_EDGE_GESTURE_PX');
        const inbox = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationHeaderInbox.tsx',
        );
        expect(inbox).toContain('min-h-[44px]');
        expect(inbox).toContain('safe-area-inset-top');
        expect(inbox).toContain('notification-sheet-handle');
        const chrome = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelChrome.ts',
        );
        expect(chrome).toContain('useMobileKeyboardInset');
        expect(chrome).toContain('useReduceMotion');
        const trap = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationFocusTrap.ts',
        );
        expect(trap).toContain('registerNativeBackHandler');
        expect(trap).toContain('stopImmediatePropagation');
        const popups = read(
            'src/app/components/lawyer/NotificationPanel/components/IncomingNotificationPopups.tsx',
        );
        expect(popups).toContain('min-h-[44px]');
        expect(popups).toContain('safe-area-inset-top');
        const layout = read('src/app/components/lawyer/NotificationPanel/notificationPanelLayout.ts');
        expect(layout).toContain('env(safe-area-inset-left)');
        expect(layout).toContain('env(safe-area-inset-right)');
        expect(layout).toContain('env(safe-area-inset-bottom)');
        expect(layout).toContain('overscroll-none');
        const shell = read('src/app/components/lawyer/NotificationPanel/NotificationShell.tsx');
        expect(shell).toContain('data-hami-overlay-safe');
        expect(shell).toContain('useNotificationMobileSuspend');
    });

    it('الورقة تُسحب للإغلاق من الهيدر على الهاتف فقط ومكشوفة للمقبض', () => {
        const panel = read('src/app/components/lawyer/NotificationPanel/index.tsx');
        expect(panel).toContain('sheetDragEnabled={isOpen && !isDesktop && !reduceMotion && route.isInboxRoute}');
        const sheet = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationPanelSheet.tsx',
        );
        expect(sheet).toContain("drag={sheetDragEnabled ? 'y' : false}");
        expect(sheet).toContain('dragListener={false}');
        expect(sheet).toContain('useDragControls');
        expect(sheet).toContain('.hami-notif-header');
        expect(sheet).toContain('info.offset.y > 108');
        expect(sheet).toContain('data-keyboard-inset');
        const breakpoints = read(
            'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.sheet.breakpoints.css',
        );
        expect(breakpoints).toContain('touch-action: none');
        const edge = read('src/app/runtime/overlayEdgeBackGesture.ts');
        expect(edge).toContain("'data-hami-notifications-open'");
        expect(edge).toContain('isAndroidNativeShell');
        expect(edge).toContain('fromInlineStart');
    });

    it('الخمول والبطارية: كيبورد وpolling ومنبث ونغمة بلا عمل في الخلفية', () => {
        const suspend = read('src/app/hooks/lawyerDashboard/useNotificationMobileSuspend.ts');
        expect(suspend).toContain('HAMI_APP_STATE_EVENT');
        expect(suspend).toContain('pagehide');
        expect(suspend).toContain('visibilitychange');
        const interval = read('src/app/hooks/useVisibilityAwareInterval.ts');
        expect(interval).toContain('HAMI_APP_STATE_EVENT');
        expect(interval).toContain('pagehide');
        const polling = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPolling.ts',
        );
        expect(polling).toContain('useVisibilityAwareInterval');
        const popupsHook = read('src/app/hooks/lawyerDashboard/useIncomingNotificationPopups.ts');
        expect(popupsHook).toContain('HAMI_APP_STATE_EVENT');
        expect(popupsHook).toContain('pagehide');
        const arrival = read('src/app/hooks/lawyerDashboard/incomingNotificationPopupArrival.ts');
        expect(arrival).toContain("visibilityState === 'hidden'");
        expect(arrival).toMatch(/if \(!hidden\) \{[\s\S]*playNotificationArrivalCue/);
        const bridge = read('src/app/runtime/notificationInstantPaintBridge.ts');
        expect(bridge).toContain('HAMI_APP_STATE_EVENT');
        expect(bridge).toContain('document.hidden');
        const keyboard = read('src/app/hooks/useMobileKeyboardInset.ts');
        expect(keyboard).toContain('isHamiNativeShell');
        const alerts = read(
            'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.alerts.css',
        );
        expect(alerts).toContain('font-size: 16px');
        const quiet = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationAlertQuietHoursFields.tsx',
        );
        expect(quiet).toContain('enterKeyHint="done"');
        const mute = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationAlertOnceMuteFields.tsx',
        );
        expect(mute).toContain('enterKeyHint="done"');
        const overlay = read(
            'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.sheet.chrome.css',
        );
        expect(overlay).toContain('touch-action: manipulation');
        const android = read(
            'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.android.css',
        );
        expect(android).toContain('backdrop-filter: none');
        expect(android).toContain('will-change: auto');
    });
});

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('notifications section surgical close honesty', () => {
    it('assemble يمرّر hostMounted من useLawyerDashboardNotifications', () => {
        const assemble = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/assembleLawyerDashboardReadyView.ts'),
            'utf8',
        );
        expect(assemble).toContain('hostMounted: notifications.notificationHostMounted');
    });

    it('Host يضم اللوحة sync بلا هيكل تحميل', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/NotificationPanelHost.tsx'),
            'utf8',
        );
        expect(host).toContain('NotificationPanel');
        expect(host).toContain('hydrateFromLocalPeek');
        expect(host).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]*hydrateFromLocalPeek/);
        expect(host).not.toMatch(/if \(shouldMount && userId\) \{[\s\S]{0,120}hydrateFromLocalPeek/);
        expect(host).not.toContain('NotificationPanelLoadingFallback');
        expect(host).not.toContain('getCachedNotificationPanel');
    });

    it('NotificationShell يملك data-notification-root ويستورد CSS الطبقة', () => {
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/NotificationShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('data-notification-root');
        expect(shell).toContain('createPortal');
        expect(shell).toContain("import './notificationPanel.css'");
        expect(shell).toContain('hostMounted');
        const layout = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/notificationPanelLayout.ts'),
            'utf8',
        );
        expect(layout).toContain('z-[200]');
        expect(layout).not.toContain('z-[100]');
        const layer = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.layer.css',
            ),
            'utf8',
        );
        expect(layer).toContain("html[data-hami-notifications-open='1'] .hami-lawyer-header");
        expect(layer).toContain("html[data-hami-notifications-open='1'] [data-hami-lawyer-dashboard]");
        expect(layer).not.toMatch(
            /html\[data-hami-notifications-open='1'\] \[data-hami-lawyer-dashboard\]\s*\{[^}]*content-visibility:\s*hidden/s,
        );
        expect(layer).toContain("html[data-hami-native='1'][data-hami-notifications-open='1'] [data-hami-lawyer-dashboard]");
        expect(layer).toContain("html[data-hami-overlay-unfreeze='1'][data-hami-notifications-open='1']");
        expect(layer).toContain('data-hami-notifications-closing');
        expect(layer).toContain('translate3d(0, 28%, 0)');
        expect(layer).toContain('translateZ(0)');
        expect(layer).toContain('z-index: 200');
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts'),
            'utf8',
        );
        expect(hook).toContain('executeNotificationsOverlayClose');
        expect(hook).toContain('beginNotificationShellExit');
        expect(hook).toContain('isNotificationShellSnappedOpen');
        expect(hook).toContain('clearNotificationShellClosing');
        expect(hook).toContain('beginNotificationShellOpen');
        expect(hook).toContain('MutationObserver');
        expect(hook).toContain("'data-hami-notifications-open'");
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('VITE_NATIVE_NOTIFICATION_SHEET');
        expect(hook).not.toMatch(
            /onOpen: \(\) => \{[\s\S]*await import\('@\/app\/runtime\/nativeNotificationSheetBridge'\)/,
        );
        expect(layer).toContain('hami-notif-sheet-track');
        expect(layer).toContain('data-hami-notif-dismiss-locked');
        const snap = fs.readFileSync(
            path.join(root, 'src/app/services/notifications/notificationShellSnap.ts'),
            'utf8',
        );
        expect(snap).not.toMatch(/\boffsetHeight\b/);
        const paint = fs.readFileSync(
            path.join(root, 'src/app/runtime/notificationInstantPaint.ts'),
            'utf8',
        );
        expect(paint).not.toMatch(/\boffsetHeight\b/);
        expect(paint).toContain('armOverlayEnterSettle');
        expect(paint).toContain('data-hami-notif-enter');
        const trigger = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerDashboardParts/components/HeaderNotificationsTrigger.tsx',
            ),
            'utf8',
        );
        expect(trigger).toContain('beginNotificationDismissLock');
        expect(trigger).toContain('paintNotificationInstantChrome');
        expect(trigger.indexOf('paintNotificationInstantChrome')).toBeLessThan(
            trigger.indexOf('onPointerDown?.()'),
        );
        const sheet = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationPanelSheet.tsx',
            ),
            'utf8',
        );
        expect(sheet).toContain('hami-notif-sheet-track');
    });

    it('لوحة الإشعارات تعلن الوصول لقارئات الشاشة', () => {
        const panel = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/index.tsx'),
            'utf8',
        );
        expect(panel).toContain('NotificationArrivalAnnouncer');
        expect(panel).toContain('isNotificationShellSnappedOpen');
        expect(panel).toContain('surfaceOpen');
    });

    it('مسارات case_details و schedule ضمن allowlist التنقّل', () => {
        const nav = fs.readFileSync(
            path.join(root, 'src/app/services/notifications/notificationNavigateSecurity.ts'),
            'utf8',
        );
        expect(nav).toContain("'case_details'");
        expect(nav).toContain("'schedule'");
        const actions = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/hooks/useNotificationActions.ts',
            ),
            'utf8',
        );
        expect(actions).toMatch(/case_details[\s\S]*isNotificationNavTarget|path = 'case_details'/);
        expect(actions).not.toMatch(/onNavigate\('case_details'/);
    });

    it('هيدر الإشعارات: زر الإغلاق على سطح المكتب 44px', () => {
        const inbox = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationHeaderInbox.tsx',
            ),
            'utf8',
        );
        const alert = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationHeaderAlertControls.tsx',
            ),
            'utf8',
        );
        expect(inbox).toContain('min-h-[44px]');
        expect(inbox).toContain('min-w-[44px]');
        expect(alert).toContain('min-h-[44px]');
        expect(alert).toContain('min-w-[44px]');
    });

    it('N6: notificationHostMounted لا يبدأ true على cold', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts'),
            'utf8',
        );
        expect(hook).not.toMatch(/useState\(true\)\s*;\s*\n\s*const \[notificationPanelSessionKey/);
        expect(hook).toMatch(
            /notificationHostMounted[\s\S]*?useState\(\(\)\s*=>\s*initialSession\.open\)/,
        );
    });

    it('منبثق الوصول: زر الإغلاق ≥44px', () => {
        const popups = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/IncomingNotificationPopups.tsx',
            ),
            'utf8',
        );
        expect(popups).toContain('min-h-[44px]');
        expect(popups).toContain('min-w-[44px]');
    });

    it('نقر إشعار نظام التشغيل مربوط بجسر التنقّل وفتح اللوحة', () => {
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(nav).toContain('bindNotificationOsTapBridge');
        const routing = fs.readFileSync(
            path.join(root, 'src/app/services/notifications/notificationOsTapRouting.ts'),
            'utf8',
        );
        expect(routing).toContain('HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT');
        expect(routing).toContain('resolveOsNotificationTap');
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts'),
            'utf8',
        );
        expect(hook).toContain('ensureNotificationsOpen');
        const escape = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/notificationEscapeStack.ts'),
            'utf8',
        );
        expect(escape).toContain("'back-to-inbox'");
        const sw = fs.readFileSync(path.join(root, 'public/sw.js'), 'utf8');
        expect(sw).toContain('HAMI_NOTIFICATION_OPEN');
        expect(sw).toContain('hamiOsNotify');
    });

    it('لا مراسلة موكل ولا comms-dispatcher في لوحة الإشعارات', () => {
        const card = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/components/NotificationCard.tsx'),
            'utf8',
        );
        expect(card).not.toContain('مراسلة الموكل');
        expect(card).not.toContain('onClientRequest');
        expect(card).not.toContain('/api/comms-dispatcher');
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/NotificationPanel/hooks/useNotificationClientRequest.ts',
                ),
            ),
        ).toBe(false);
    });

    it('بطاقة مشاركة الإضبارة: أزرار الفتح/الملخص ≥44px', () => {
        const card = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/CaseShareCard.tsx',
            ),
            'utf8',
        );
        expect(card.match(/min-h-\[44px\]/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    });

    it('كاش الإشعارات المحلي ضمن سوابق التشفير', () => {
        const keys = fs.readFileSync(
            path.join(root, 'src/app/services/secureStorageKeys.ts'),
            'utf8',
        );
        expect(keys).toContain("'hami:notifications:v1:'");
    });

    it('خطافات E2E للإشعارات تعمل في VITE_E2E وليس DEV فقط', () => {
        const store = fs.readFileSync(
            path.join(root, 'src/app/stores/notificationStore.ts'),
            'utf8',
        );
        const storeE2e = fs.readFileSync(
            path.join(root, 'src/app/stores/notificationStoreE2e.ts'),
            'utf8',
        );
        const e2eWindow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/notifications/useNotificationE2eWindow.ts'),
            'utf8',
        );
        expect(store).toContain('isViteE2eHooksEnabled');
        expect(store).toContain('applyE2eInboxSeed');
        expect(storeE2e).toContain('__hamiE2eSeedInbox');
        expect(store).toContain('keepMemory');
        expect(e2eWindow).toContain('isViteE2eHooksEnabled');
        expect(store).not.toMatch(/if \(import\.meta\.env\.DEV && typeof window/);
    });
});

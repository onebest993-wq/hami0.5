import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('notification panel sheet architecture', () => {
    it('لوحة الإشعارات: مسار واحد للورقة بلا AnimatePresence على جسم التبويب', () => {
        const panel = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/index.tsx'),
            'utf8',
        );
        const scroll = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationPanelScrollRegion.tsx',
            ),
            'utf8',
        );
        const route = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelRoute.ts',
            ),
            'utf8',
        );
        expect(panel).toContain('NotificationPanelSheet');
        expect(panel).toContain('NotificationPanelScrollRegion');
        expect(route).toContain("setPanelRoute('alert-controls')");
        expect(route).toContain('prefetchNotificationAlertControls');
        expect(scroll).toContain('NotificationInboxRouteBody');
        expect(scroll).toContain('hami-notif-route-switch');
        expect(scroll).toContain('hami-notif-route-pane');
        expect(scroll).not.toMatch(/\bAnimatePresence\b/);
        expect(scroll).not.toContain('mode="wait"');
    });

    it('تحكم التنبيهات: بلا open prop ولا طبقة scrim إضافية', () => {
        const controls = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationAlertControls.tsx',
            ),
            'utf8',
        );
        expect(controls).not.toContain('if (!open) return null');
        expect(controls).not.toContain('bg-[#0A0F1C]/95');
        expect(controls).toContain('px-3 py-2');
    });

    it('هيدر الإشعارات: زر رجوع لمسار التحكم', () => {
        const header = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationHeader.tsx',
            ),
            'utf8',
        );
        const alertHeader = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationHeaderAlertControls.tsx',
            ),
            'utf8',
        );
        expect(header).toContain('NotificationHeaderAlertControls');
        expect(header).toContain('panelRoute');
        expect(alertHeader).toContain('notification-alert-controls-back');
        expect(alertHeader).toContain('notification-alert-controls-close');
        const inbox = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationHeaderInbox.tsx',
            ),
            'utf8',
        );
        expect(inbox).toContain('notification-panel-close');
        expect(inbox).toContain('notification-mark-all-read');
    });

    it('أبعاد الهاتف/اللوحي: ورقة كاملة على الموبايل + عرض متدرّج على اللوحيات', () => {
        const layout = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/notificationPanelLayout.ts'),
            'utf8',
        );
        const panel = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/index.tsx'),
            'utf8',
        );
        const sheetCss = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.sheet.breakpoints.css',
            ),
            'utf8',
        );
        const chrome = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelChrome.ts',
            ),
            'utf8',
        );
        expect(layout).toContain('sm:max-w-[min(100%,420px)]');
        expect(layout).toContain('md:max-w-[min(100%,460px)]');
        expect(layout).toContain('lg:max-w-[min(100%,480px)]');
        expect(layout).toContain('env(safe-area-inset-right)');
        expect(layout).toContain('env(safe-area-inset-bottom)');
        expect(panel).toContain('NotificationPanelSheet');
        expect(chrome).toContain('useMobileKeyboardInset(isOpen, true)');
        expect(sheetCss).toContain('@media (max-width: 639px)');
        expect(sheetCss).toContain('@media (min-width: 768px)');
        expect(sheetCss).toContain('@media (min-width: 1024px)');
        expect(sheetCss).toContain('92dvh');
        expect(sheetCss).not.toContain('56dvh');
        expect(sheetCss).toContain('height: auto');
    });
});

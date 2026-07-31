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

    it('NotificationShell يملك data-notification-root ويستورد CSS الطبقة', () => {
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/NotificationShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('data-notification-root');
        expect(shell).toContain("import './notificationPanel.css'");
        expect(shell).toContain('hostMounted');
    });

    it('لوحة الإشعارات تعلن الوصول لقارئات الشاشة', () => {
        const panel = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NotificationPanel/index.tsx'),
            'utf8',
        );
        expect(panel).toContain('NotificationArrivalAnnouncer');
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
        const header = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationHeader.tsx',
            ),
            'utf8',
        );
        expect(header).toContain('min-h-[44px]');
        expect(header).toContain('min-w-[44px]');
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
});

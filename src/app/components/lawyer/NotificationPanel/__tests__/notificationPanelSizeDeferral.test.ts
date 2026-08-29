import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { isSessionMuted } from '@/app/services/notifications/notificationSessionMute';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import { patchNotificationSettings, sessionMuteUntilMs } from '@/app/services/settings/notificationSettings';
import { partitionCaseShareForPanel } from '@/app/components/lawyer/NotificationPanel/utils/partitionCaseShareForPanel';

const root = process.cwd();

describe('notification panel size deferral', () => {
    it('وارد اللوحة لا يستورد AlertControls أو CaseShare بشكل ثابت', () => {
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
        const inbox = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationInboxRouteBody.tsx',
            ),
            'utf8',
        );
        expect(panel).toContain('notificationPanelLazyModules');
        expect(panel).toContain("from '@/app/services/notifications/notificationSessionMute'");
        expect(panel).not.toContain("from '@/app/services/notifications/notificationAlertPolicy'");
        expect(scroll).toContain('NotificationAlertControlsLazy');
        expect(scroll).toContain('getCachedNotificationAlertControls');
        expect(inbox).toContain('CaseSharePanelSectionLazy');
        expect(inbox).not.toContain('key={activeTab}');
        expect(panel).not.toMatch(/import \{ NotificationAlertControls \}/);
    });

    it('SharedDossierViewer مؤجّل داخل CaseSharePanelSection', () => {
        const section = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/CaseSharePanelSection.tsx',
            ),
            'utf8',
        );
        expect(section).toContain('SharedDossierViewerLazy');
        expect(section).not.toMatch(/import \{ SharedDossierViewer \}/);
    });

    it('حدث فتح اللوحة من OS في وحدة أحداث خفيفة', () => {
        const events = fs.readFileSync(
            path.join(root, 'src/app/services/notifications/notificationOsTapEvents.ts'),
            'utf8',
        );
        expect(events).toContain('HAMI_OS_NOTIFICATION_OPEN_PANEL_EVENT');
        const focusHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelFocus.ts',
            ),
            'utf8',
        );
        expect(focusHook).toContain('notificationOsTapEvents');
        const push = fs.readFileSync(
            path.join(root, 'src/app/services/PushNotificationService.ts'),
            'utf8',
        );
        expect(push).toContain('notificationOsTapEvents');
        expect(push).not.toContain('notificationOsTapRouting');
    });

    it('جسر الورقة الأصلية لا يُستورد ثابتاً في orchestration', () => {
        const orch = fs.readFileSync(
            path.join(
                root,
                'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts',
            ),
            'utf8',
        );
        expect(orch).not.toMatch(
            /import \{[^}]*installNativeNotificationSheetBridge[^}]*\} from '@\/app\/runtime\/nativeNotificationSheetBridge'/,
        );
        expect(orch).toContain("VITE_NATIVE_NOTIFICATION_SHEET !== 'true'");
        expect(orch).toContain("import('@/app/runtime/nativeNotificationSheetBridge')");
    });

    it('لا قاعدة CSS ميتة لـ bucket-label', () => {
        const sheet = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.sheet.css',
            ),
            'utf8',
        );
        expect(sheet).not.toContain('hami-notif-bucket-label');
    });

    it('فتح تحكم التنبيهات: تدفئة عند زر التحكم + pointerdown بلا AnimatePresence wait', () => {
        const route = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelRoute.ts',
            ),
            'utf8',
        );
        const header = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationHeaderInbox.tsx',
            ),
            'utf8',
        );
        const scroll = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/components/NotificationPanelScrollRegion.tsx',
            ),
            'utf8',
        );
        expect(route).toContain('prefetchNotificationAlertControls');
        expect(route).toContain("if (!isOpen) setPanelRoute('inbox')");
        expect(route).not.toContain('setTimeout');
        expect(header).toContain('openedByPointerRef');
        expect(header).toContain('onPointerDown');
        expect(scroll).not.toContain('AnimatePresence');
        expect(scroll).not.toContain('mode="wait"');
    });

    it('isSessionMuted في الوحدة الخفيفة يعمل', () => {
        const settings = {
            ...LAWYER_SETTINGS_V2_DEFAULTS,
            notifications: patchNotificationSettings(LAWYER_SETTINGS_V2_DEFAULTS.notifications, {
                sessionMutedUntil: sessionMuteUntilMs(30),
            }),
        };
        expect(isSessionMuted(settings)).toBe(true);
        expect(isSessionMuted(LAWYER_SETTINGS_V2_DEFAULTS)).toBe(false);
    });

    it('partitionCaseShareForPanel مصدر واحد', () => {
        const parts = partitionCaseShareForPanel(
            [
                {
                    id: '1',
                    ownerId: 'a',
                    recipientId: 'u',
                    status: 'pending',
                } as never,
            ],
            'u',
        );
        expect(parts.hasContent).toBe(true);
        expect(parts.pendingIncoming).toHaveLength(1);
        const panel = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel.ts',
            ),
            'utf8',
        );
        const caseHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/NotificationPanel/hooks/useCaseSharePanel.ts',
            ),
            'utf8',
        );
        expect(panel).toContain('partitionCaseShareForPanel');
        expect(caseHook).toContain('partitionCaseShareForPanel');
    });
});

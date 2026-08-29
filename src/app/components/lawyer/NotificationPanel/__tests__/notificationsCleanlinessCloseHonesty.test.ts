import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('notifications cleanliness close honesty', () => {
    it('polling لا يكرّر منطق الرؤية، والهيدر يستورد أيقونات الجرس من المصدر المشترك', () => {
        const polling = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPolling.ts',
        );
        expect(polling).toContain('useVisibilityAwareInterval');
        expect(polling).not.toContain('document.visibilityState');
        const trigger = read(
            'src/app/components/lawyer/LawyerDashboardParts/components/HeaderNotificationsTrigger.tsx',
        );
        expect(trigger).toContain('header-notifications-trigger');
        expect(trigger).not.toContain("from 'lucide-react'");
        const panel = read('src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanel.ts');
        expect(panel).toContain('caseShareAll');
        expect(panel).not.toContain('incoming: caseShareIncoming');
        expect(panel).not.toContain('panelSessionKey');
        const viewState = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelViewState.ts',
        );
        expect(viewState).not.toContain('useMinDisplayedLoading');
        const panelIndex = read('src/app/components/lawyer/NotificationPanel/index.tsx');
        expect(panelIndex).not.toContain('useNotificationLifecycle');
    });

    it('لا ذراع تفاعل ميت ولا alias كشف ولا cache مكوّن غير مقروء', () => {
        const paint = read('src/app/runtime/notificationInstantPaint.ts');
        expect(paint).not.toContain('scheduleNotificationOverlayInteractionArm');
        expect(paint).not.toContain('revealNotificationWarmPanel');
        expect(paint).not.toContain('NOTIFICATION_INTERACT_ARM_MS');
        expect(paint).not.toContain('interactArmCleanup');
        expect(paint).toContain('armNotificationOverlayInteraction');
        expect(paint).toContain('paintNotificationInstantChrome');

        const loader = read('src/app/runtime/notificationPanelLoader.ts');
        expect(loader).not.toContain('getCachedNotificationPanel');
        expect(loader).not.toContain('cachedNotificationPanel');
        expect(loader).toContain('panelModulePromise');
    });

    it('لا هيكل تحميل يتيم ولا طبقة توهج CSS بلا DOM', () => {
        expect(
            existsSync(
                join(root, 'src/app/components/lawyer/LawyerDashboardParts/NotificationPanelLoadingFallback.tsx'),
            ),
        ).toBe(false);
        expect(
            existsSync(
                join(root, 'src/app/components/lawyer/NotificationPanel/hooks/useMinDisplayedLoading.ts'),
            ),
        ).toBe(false);
        expect(
            existsSync(
                join(root, 'src/app/components/lawyer/NotificationPanel/hooks/useNotificationLifecycle.ts'),
            ),
        ).toBe(false);
        const layer = read(
            'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.layer.css',
        );
        expect(layer).not.toContain('notification-panel-shell-loading');
        const android = read(
            'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.android.css',
        );
        expect(android).not.toContain('.hami-notif-fx-orb');
        const homeFx = read('src/app/components/lawyer/dashboard/lawyerHomeFx-android.css');
        expect(homeFx).not.toContain('.hami-notif-fx-orb');
    });

    it('واجهة الشِل بلا مفتاح جلسة ميت وبلا تصدير عدّاد مشاركة غير مستهلك', () => {
        const hook = read('src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts');
        expect(hook).not.toContain('notificationPanelSessionKey');
        expect(hook).not.toContain('bumpNotificationPanelSession');
        expect(hook).not.toContain('export type { SearchNotificationRow }');
        expect(hook).not.toMatch(/return \{[\s\S]*setShowNotifications,/);
        expect(hook).not.toMatch(/return \{[\s\S]*caseSharePendingCount,/);
        expect(hook).toContain("runNotificationShellOpen");
        expect(hook).toContain('ensureNotificationsOpen');
        expect(hook).not.toContain('clearNotificationForceVisible');

        const assemble = read('src/app/hooks/lawyerDashboard/assembleLawyerDashboardReadyView.ts');
        expect(assemble).not.toContain('panelSessionKey');
        const shell = read('src/app/components/lawyer/NotificationPanel/NotificationShell.tsx');
        expect(shell).not.toContain('panelSessionKey');
        const types = read('src/app/components/lawyer/NotificationPanel/types.ts');
        expect(types).not.toContain('panelSessionKey');
    });

    it('نقر المنتدى من الإشعار مسار واحد: نية المنتدى دون onNavigate مزدوج', () => {
        const actions = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationActions.ts',
        );
        expect(actions).toContain('requestOpenLawyerForum');
        expect(actions).toMatch(/else if \(path && isNotificationNavTarget\(path\)\) onNavigate/);
        const nav = read('src/app/hooks/useLawyerDashboardNavigation.ts');
        expect(nav).toContain('requestOpenLawyerForum');
        expect(nav).toContain('resolveNotificationOwnedNavigate');
        expect(nav).not.toContain('paintForumInstantChrome');
        expect(nav).not.toContain('applyForumOpaqueChrome');
        expect(nav).not.toContain('setCommunityDeepLink');
    });
});

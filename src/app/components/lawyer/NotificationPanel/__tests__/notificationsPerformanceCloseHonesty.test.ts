import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NOTIFICATION_PERF_BUDGET } from '@/app/services/notifications/notificationPerfBudget';
import { NOTIFICATION_DISMISS_UNLOCK_FALLBACK_MS } from '@/app/runtime/notificationInstantPaint';

const root = process.cwd();

function read(rel: string): string {
    return readFileSync(join(root, rel), 'utf8');
}

describe('notifications performance close honesty', () => {
    it('ميزانية الفتح وقفل الإغلاق أثناء لمسة الجرس', () => {
        expect(NOTIFICATION_PERF_BUDGET.openToInteractiveMs.target).toBeLessThanOrEqual(2_200);
        expect(NOTIFICATION_PERF_BUDGET.openToInteractiveMs.ciColdMax).toBeLessThanOrEqual(6_000);
        expect(NOTIFICATION_PERF_BUDGET.openToInteractiveMs.ciCachedMax).toBeLessThanOrEqual(3_500);
        expect(NOTIFICATION_DISMISS_UNLOCK_FALLBACK_MS).toBe(700);
        const trigger = read(
            'src/app/components/lawyer/LawyerDashboardParts/components/HeaderNotificationsTrigger.tsx',
        );
        expect(trigger).toContain('beginNotificationDismissLock');
        expect(trigger).toContain('paintNotificationInstantChrome');
        expect(trigger).toContain('activateOnPointerDown');
    });

    it('polling يتوقف مع إخفاء التبويب', () => {
        const polling = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPolling.ts',
        );
        expect(polling).toContain('useVisibilityAwareInterval');
        expect(polling).toContain('TIMING.NOTIFICATION_POLL');
        expect(polling).not.toMatch(/setInterval\(/);
    });

    it('لا جلب خادم مكرر داخل نافذة الطزاجة ولا spring على البطاقات', () => {
        expect(NOTIFICATION_PERF_BUDGET.fetchFreshWindowMs).toBeLessThanOrEqual(8_000);
        const store = read('src/app/stores/notificationStore.ts');
        expect(store).toContain('lastFetchedAt');
        expect(store).toContain('fetchFreshWindowMs');
        expect(store).toContain('unreadCountOf');
        const openFlow = read(
            'src/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow.ts',
        );
        expect(openFlow.indexOf("dismissTransientOverlays('notifications')")).toBeLessThan(
            openFlow.indexOf('paintNotificationInstantChrome()'),
        );
        const card = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationCard.tsx',
        );
        expect(card).toContain('layout={false}');
        expect(card).toContain('initial={false}');
        const cardsCss = read(
            'src/app/components/lawyer/NotificationPanel/styles/notificationPanel.sheet.cards.css',
        );
        expect(cardsCss).toContain('content-visibility: auto');
        const shell = read(
            'src/app/components/lawyer/NotificationPanel/NotificationShell.tsx',
        );
        expect(shell).toContain('popupsEnabled');
        expect(shell.indexOf('popupsEnabled')).toBeLessThan(shell.indexOf('panelEnabled'));
        const popupsHook = read('src/app/hooks/lawyerDashboard/useIncomingNotificationPopups.ts');
        expect(popupsHook).toContain('hasHydratedOnce');
        expect(popupsHook).toContain('HAMI_INBOX_NOTIFICATION_ARRIVED');
        const forum = read(
            'src/app/hooks/lawyerDashboard/community/communityShellOpenFlow.ts',
        );
        expect(forum).toContain('isCommunityOpenInFlight');
        const actions = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationActions.ts',
        );
        expect(actions).toContain('requestOpenLawyerForum');
        expect(actions).toMatch(/else if \(path && isNotificationNavTarget\(path\)\) onNavigate/);
        expect(actions.indexOf("path === 'community'")).toBeLessThan(actions.indexOf('onNavigate(path'));
        const orch = read(
            'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts',
        );
        expect(orch).toContain('bindForumOpenIntent');
        const conceal = read('src/app/hooks/lawyerDashboard/useLawyerDashboardCommunity.ts');
        expect(conceal).toContain('isForumOpenIntentPending');
        const nav = read('src/app/hooks/useLawyerDashboardNavigation.ts');
        expect(nav).toContain('requestOpenLawyerForum');
        expect(nav).toContain('resolveNotificationOwnedNavigate');
        expect(nav).not.toContain('جاري فتح الأرشيف');
        expect(nav).not.toMatch(/path === 'community'[\s\S]{0,80}setShowCommunity\(true\)/);
        expect(nav).not.toContain('paintForumInstantChrome');
        expect(nav).not.toContain('applyForumOpaqueChrome');
        const bloom = read('src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css');
        expect(bloom).toContain('.hami-header-tool-btn .hami-header-tool-btn__icon');
        expect(bloom).toContain('hami-tool-bloom');
    });

    it('لا شجرة بطاقات دافئة وهي مغلقة، والقائمة تُقطَع عند الفتح', () => {
        const index = read('src/app/components/lawyer/NotificationPanel/index.tsx');
        expect(index).toContain('contentArmed={isOpen}');
        expect(index).toContain('ensureId={panel.focusNotificationId}');
        const body = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationTabPanelBody.tsx',
        );
        expect(body).toContain('if (!listActive) return null');
        const list = read(
            'src/app/components/lawyer/NotificationPanel/components/NotificationList.tsx',
        );
        expect(list).toContain('useNotificationListWindow');
        const windowUtil = read(
            'src/app/components/lawyer/NotificationPanel/utils/notificationListWindow.ts',
        );
        expect(windowUtil).toContain('NOTIFICATION_LIST_RENDER_BATCH');
        const keep = read('src/app/services/notifications/notificationHostKeepAlive.ts');
        expect(keep).toContain("root.hamiLite === '1'");
        expect(keep).toContain("root.hamiNative === '1'");
        const hostLife = read(
            'src/app/hooks/lawyerDashboard/notifications/useNotificationHostLifecycle.ts',
        );
        expect(hostLife).toContain('shouldKeepNotificationHostWarm');
        const dash = read('src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts');
        expect(dash).toContain('setNotificationHostMounted(false)');
        const openFlow = read(
            'src/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow.ts',
        );
        expect(openFlow).not.toContain('prefetchNotificationAlertControls');
        expect(openFlow).toContain('shouldKeepNotificationHostWarm');
        const warm = read('src/app/hooks/lawyerDashboard/notificationIntentWarm.ts');
        expect(warm).not.toContain('prefetchNotificationAlertControls');
        const route = read(
            'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelRoute.ts',
        );
        expect(route).toContain("if (!isOpen) setPanelRoute('inbox')");
    });
});

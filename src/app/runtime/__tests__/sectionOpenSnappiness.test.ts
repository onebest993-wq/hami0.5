import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('section open snappiness — settings/home/execution', () => {
    it('stubs تطلي الستارة في لمسة الفتح قبل تسليح الجزيرة', () => {
        const deferred = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(deferred).toContain('snapTransactionsShellOpen');
        expect(deferred).toContain('snapFieldTasksShellOpen');
        expect(deferred).toContain('snapTasksManagerShellOpen');
        expect(deferred).toContain('snapGlobalSearchShellOpen');
        const preDock = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/createPreDockFeatureStubs.ts'),
            'utf8',
        );
        expect(preDock).toContain('snapScheduleShellOpen');
        expect(preDock).toContain('applyRepositoryOpaqueChrome');
        expect(preDock).toContain('applyForumOpaqueChrome');
        const boot = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/createBootChromeFeatureStubs.ts'),
            'utf8',
        );
        expect(boot).toContain('paintSettingsInstantChrome');
        expect(boot).toContain('snapProfileShellClose');
        expect(boot).not.toContain('snapProfileShellOpen');
        expect(boot).toContain('markProfileOpenedThisPage');
    });

    it('stubs لا تركّب fieldTasks Host قبل التسليح؛ الإعدادات خارج الجزيرة', () => {
        const src = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(src).not.toContain('settingsHostMounted');
        expect(src).toMatch(/fieldTasksHostMounted:\s*false/);
    });

    it('settingsHostMounted يبدأ من الجلسة فقط؛ lifecycle بعد first-tab/interactive لا في أول commit', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts'),
            'utf8',
        );
        expect(src).toContain('useSettingsHostLifecycle');
        expect(src).toContain('commitSettingsShellOpen');
        expect(src).not.toContain('flushSync(() => {\n            setShowSettings(false)');
        const life = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/settings/useSettingsHostLifecycle.ts'),
            'utf8',
        );
        expect(life).toContain('onLawyerDashboardFirstTabOpen');
        expect(life).toContain('scheduleIdleWork');
        expect(life).toContain('nativeIdleOptions');
        expect(life).toContain('isHamiNativeShell');
        expect(life).toContain('onDashboardInteractive');
        expect(life).not.toMatch(
            /useLayoutEffect\(\(\) => \{\s*if \(!signedIn\) return;\s*ensureSettingsHostMounted\(\);/,
        );
    });

    it('notifications: paint فوري؛ React بلا flushSync؛ peek قبل أول رسم', () => {
        const flow = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow.ts'),
            'utf8',
        );
        expect(flow).toContain('paintNotificationInstantChrome');
        expect(flow).toContain("import('@/app/stores/notificationStore')");
        expect(flow).toContain('hydrateFromLocalPeek');
        expect(flow.indexOf('paintNotificationInstantChrome')).toBeLessThan(
            flow.indexOf('hydrateFromLocalPeek'),
        );
        expect(flow).not.toContain('prefetchNotificationAlertControls');
        const route = readFileSync(
            join(root, 'src/app/components/lawyer/NotificationPanel/hooks/useNotificationPanelRoute.ts'),
            'utf8',
        );
        expect(route).toContain('prefetchNotificationAlertControls');
        expect(route).toContain('navigateToAlertControls');
        expect(flow).not.toMatch(/from ['"]react-dom['"]/);
        expect(flow).not.toMatch(/\bflushSync\s*\(/);
        expect(flow).not.toContain('requestAnimationFrame');
    });

    it('settings: paint فوري؛ React بلا flushSync حتى لا تُرمى الشجرة دفعة', () => {
        const flow = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/settings/settingsShellOpenFlow.ts'),
            'utf8',
        );
        expect(flow).toContain('paintSettingsInstantChrome');
        expect(flow).not.toMatch(/from ['"]react-dom['"]/);
        expect(flow).not.toContain('requestAnimationFrame');
    });

    it('global search: طلاء ثم فتح في pointerdown؛ React بلا flushSync', () => {
        const flow = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/globalSearch/globalSearchShellOpenFlow.ts'),
            'utf8',
        );
        const trigger = readFileSync(
            join(
                root,
                'src/app/components/lawyer/LawyerDashboardParts/components/HeaderSearchTrigger.tsx',
            ),
            'utf8',
        );
        expect(flow).toContain('paintGlobalSearchInstantChrome');
        expect(flow).not.toMatch(/from ['"]react-dom['"]/);
        expect(flow).not.toMatch(/\bflushSync\s*\(/);
        expect(trigger).toContain('activateOnPointerDown');
        expect(trigger).not.toContain('activateOnPointerDown={false}');
        expect(trigger.indexOf('paintGlobalSearchInstantChrome')).toBeLessThan(
            trigger.indexOf('onPointerDown?.()'),
        );
    });

    it('PostInteractive يؤخّر التسليح بعد interactive', () => {
        const src = readFileSync(
            join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardPostInteractiveRuntime.tsx',
            ),
            'utf8',
        );
        expect(src).toContain('requestIdleCallback');
        expect(src).toContain('setTimeout');
        expect(src).not.toMatch(
            /useEffect\(\(\) => onDashboardInteractive\(\(\) => setArmed\(true\)\), \[\]\)/,
        );
    });

    it('execution warm يقيّم أول paint للإضبارة فوراً', () => {
        const src = readFileSync(join(root, 'src/app/runtime/executionWorkspaceWarm.ts'), 'utf8');
        expect(src).toContain('ensureExecutionDossierFirstPaintReady');
        expect(src).toContain('primeExecutionDossierSurface');
    });

    it('MainView underlay inert عبر DOM وليس inertProps على كل فتح', () => {
        const src = readLawyerDashboardMainViewSurface();
        expect(src).toContain('tabStackInertRef');
        expect(src).toContain('underlayInert');
        expect(src).toContain('isNotificationShellSnappedOpen');
        expect(src).toContain("setAttribute('inert'");
        expect(src).not.toContain('inertProps(settingsOpen)');
    });

    it('تسليم stub→live يفتح متزامناً ويُبقي الستارة حتى يكتمل الفتح', () => {
        const orch = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
            'utf8',
        );
        expect(orch).toContain('markShellHandoffPending');
        expect(orch).toContain('isPreDockPendingOpSatisfied');
        expect(orch).toContain('isDeferredPendingOpSatisfied');
        expect(orch).not.toContain('queueMicrotask(() => runPreDockPendingOp');
        expect(orch).not.toContain('queueMicrotask(() => runDeferredPendingOp');
        expect(orch).not.toContain('queueMicrotask(() => runBootChromePendingOp');
        const tx = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardTransactions.ts'),
            'utf8',
        );
        expect(tx).toContain('deferShellConcealAfterHandoff');
        expect(tx).toContain("isShellHandoffPending('transactions')");
        const tasks = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts'),
            'utf8',
        );
        expect(tasks).toContain('deferShellConcealAfterHandoff');
        expect(tasks).toContain("isShellHandoffPending('field-tasks')");
        const forum = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/community/communityShellOpenFlow.ts'),
            'utf8',
        );
        const overlayCatch = forum.match(
            /loadCommunityOverlayEntry\(\)[\s\S]*?\.catch\(\(\) => \{[\s\S]*?\}\);/,
        )?.[0];
        expect(overlayCatch).toBeTruthy();
        expect(overlayCatch).toContain('finishPending(revealOnce)');
        expect(overlayCatch).not.toContain('concealForumWarmShell');
    });
});

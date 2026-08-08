import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('perceived boot wait cut honesty', () => {
    it('deferred styles بلا rAF مزدوج؛ الجدولة بعد content-ready لا من أول بايت', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/runtime/deferredAppStyles.ts'), 'utf8');
        expect(src).toContain('void startDeferredAppStylesLoad()');
        expect(src).not.toMatch(/requestAnimationFrame\(\(\)\s*=>\s*\{\s*requestAnimationFrame\(load\)/);
        const preamble = fs.readFileSync(path.join(root, 'src/boot/bootEntryPreamble.ts'), 'utf8');
        expect(preamble).toContain('onBootContentReady');
        expect(preamble).toContain('scheduleDeferredAppStyles');
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('bootEntryPreamble');
        expect(index).toContain('mountApplication');
        expect(index).not.toMatch(
            /critical-shell\.css';\s*\n\s*void import\('@\/app\/runtime\/deferredAppStyles'\)\.then\(\(m\)\s*=>\s*\{\s*\n\s*m\.scheduleDeferredAppStyles\(\);/,
        );
    });

    it('bootReveal يكشف عند first-tab؛ deferred-app/dock بالتوازي بلا حجب', () => {
        const reveal = fs.readFileSync(path.join(root, 'src/app/bootstrap/bootReveal.ts'), 'utf8');
        expect(reveal).toContain('queueMicrotask(fire)');
        expect(reveal).toContain('FIRST_TAB_OPEN_EVENT');
        expect(reveal).toContain('shellPaintedReady');
        expect(reveal).toContain('return shellPaintedReady');
        expect(reveal).toContain('finishAfterStablePaint');
        expect(reveal).toContain('stylesDeferMs');
        expect(reveal).toContain('startStylesRace');
        expect(reveal).toContain('waitForHomeDockBootChunk');
    });

    it('Inner يسخّن MainView/HomeTab بعد mark لتقليص first-tab', () => {
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        expect(inner).toContain('warmPostInteractiveDashboardChunks');
        expect(inner).toContain("import('./LawyerDashboardMainView')");
        expect(inner).toContain("import('./LawyerDashboardHomeTab')");
        expect(inner).toContain("typeof window !== 'undefined'");
        const fn = inner.slice(inner.indexOf('export function LawyerDashboardInner'));
        expect(fn.indexOf('markDashboardInteractiveOnce()')).toBeLessThan(
            fn.indexOf('warmPostInteractiveDashboardChunks()'),
        );
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).not.toContain(
            "import('@/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime')",
        );
        const warm = fs.readFileSync(
            path.join(root, 'src/app/runtime/dashboardPostInteractiveWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('onBootContentReady');
        expect(warm).not.toContain('hami:dashboard-interactive');
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('postCriticalSurfacesMount');
        expect(main).toContain('onBootContentReady');
    });

    it('إعدادات اللوحة لا تحجب أول paint بـ useLayoutEffect', () => {
        const persistence = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/lawyerSettingsPersistence.ts'),
            'utf8',
        );
        expect(persistence).toContain('readProviderBootSettings');

        const provider = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/LawyerSettingsProvider.tsx'),
            'utf8',
        );
        expect(provider).not.toMatch(/useLayoutEffect\(\(\)\s*=>\s*\{[\s\S]*loadInitialSettings/);
        expect(provider).toContain('useEffect(() => {');
        expect(provider).toContain('loadInitialSettingsAsync()');
    });

    it('جسر الجنائي يتأخر إطاراً بعد أول رسم للـ Runtime', () => {
        const runtime = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            'utf8',
        );
        expect(runtime).toContain('bridgeLive');
        expect(runtime).toContain('backgroundRuntimeEnabled && bridgeLive');
    });

    it('HomeTab يضمّ Hub مباشرة لتقليل waterfall الإقلاع', () => {
        const home = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(home).toContain('LawyerHomeHubCard');
        expect(home).not.toContain('LazyLawyerHomeHubCard');
        expect(home).toMatch(
            /import\s*\{[^}]*LawyerHomeHubCard[^}]*\}\s*from\s*['"]@\/app\/components\/lawyer\/LawyerHomeHubCard['"]/,
        );
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('experimentalMinChunkSize');
        expect(vite).toContain("'vendor-zustand'");
    });

    it('vite يفصل vendor-zustand و boot-runtime عن المسار الحرج', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('resolveBootRuntimeChunk');
        expect(vite).toContain("return 'vendor-zustand'");
        expect(vite).toContain('vendor-react|boot-runtime');
        expect(vite).toContain("return 'vendor-ui'");
        expect(vite).toContain('/lucide-react/');
    });

    it('شارة الإشعارات على أول paint من peekLite بلا notificationStore متزامن', () => {
        const notif = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts'),
            'utf8',
        );
        expect(notif).toContain('peekNotificationUnreadCount');
        expect(notif).not.toMatch(/import \{ useNotificationStore \} from '@\/app\/stores\/notificationStore'/);
        expect(notif).toContain('useNotificationStoreSync');
        const sync = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/notifications/useNotificationStoreSync.ts'),
            'utf8',
        );
        expect(sync).toContain('loadNotificationStore');
        expect(sync).not.toMatch(/import \{ useNotificationStore \} from '@\/app\/stores\/notificationStore'/);
        expect(sync).toContain('onDashboardInteractive');
        const effects = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRuntimeEffects.ts'),
            'utf8',
        );
        expect(effects).not.toMatch(/import \{ useNotificationStore \} from '@\/app\/stores\/notificationStore'/);
    });

    it('case-shares على أول paint من peekLite بلا CaseShareApiService متزامن', () => {
        const shares = fs.readFileSync(path.join(root, 'src/app/hooks/useIncomingCaseShares.ts'), 'utf8');
        expect(shares).toContain('peekCaseSharePendingCount');
        expect(shares).not.toMatch(
            /import \{ CaseShareApiService \} from '@\/app\/services\/caseShare\/caseShareApiService'/,
        );
        expect(shares).toContain("import('@/app/services/caseShare/caseShareApiService')");
        const ws = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace.ts'),
            'utf8',
        );
        expect(ws).not.toMatch(
            /import \{ unpinWorkspaceForDeletedFile \} from '@\/app\/workspace\/unpinWorkspaceEntity'/,
        );
        expect(ws).toContain("import('@/app/workspace/unpinWorkspaceEntity')");
        const intent = fs.readFileSync(path.join(root, 'src/app/utils/lazyComponentsIntent.ts'), 'utf8');
        expect(intent).not.toMatch(
            /import \{ requestCriminalDashboardBridgeActivate \} from '@\/app\/slices\/criminal\/bridgeEvent'/,
        );
        const surface = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardSurfaceUtils.ts'),
            'utf8',
        );
        expect(surface).toContain("from '@/app/services/settings/apply'");
        expect(surface).toContain("from '@/app/services/settings/surfaceAppearance'");
        expect(surface).not.toMatch(/from '@\/app\/services\/settings'/);
        expect(surface).not.toContain('settingsRuntime');
    });

    it('settings snapshot خفيف بلا migrate متزامن على المسار الحرج', () => {
        const snap = fs.readFileSync(
            path.join(root, 'src/app/services/settings/settingsSnapshot.ts'),
            'utf8',
        );
        expect(snap).toContain('hydrateLawyerSettingsFast');
        expect(snap).not.toContain("from './migrate'");
        const runtime = fs.readFileSync(
            path.join(root, 'src/app/services/settings/settingsRuntime.ts'),
            'utf8',
        );
        expect(runtime).not.toContain("from './migrate'");
        const persistence = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/lawyerSettingsPersistence.ts'),
            'utf8',
        );
        expect(persistence).toContain("import('@/app/services/settings/migrate')");
        expect(persistence).not.toMatch(/import \{[^}]*migrateLawyerSettings[^}]*\} from/);
        const provider = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/LawyerSettingsProvider.tsx'),
            'utf8',
        );
        expect(provider).toContain('onBootContentReady');
        const quantum = fs.readFileSync(
            path.join(root, 'src/app/context/QuantumTasksProvider.tsx'),
            'utf8',
        );
        expect(quantum).toContain('onBootContentReady');
        const preamble = fs.readFileSync(path.join(root, 'src/boot/bootEntryPreamble.ts'), 'utf8');
        expect(preamble).toContain("import('@/app/services/settings/settingsSnapshot')");
        expect(preamble).not.toContain("from '@/app/services/settings/settingsRuntime'");
    });

    it('orchestration يستورد useThemeStyles من الملف الخفيف لا LawyerShared', () => {
        const src = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        expect(src).toContain("from '@/app/components/lawyer/lawyerThemeStyles'");
        expect(src).not.toContain("useThemeStyles } from '@/app/components/lawyer/LawyerShared'");
        expect(src).not.toContain("useThemeStyles } from \"@/app/components/lawyer/LawyerShared\"");
    });

    it('useAppLock لا يسحب nativeBiometricBridge بشكل متزامن إلى stem', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/hooks/useAppLock.ts'), 'utf8');
        expect(src).not.toMatch(/import \{[^}]*hasNativeBiometricEnrollment[^}]*\} from '@\/app\/runtime\/nativeBiometricBridge'/);
        expect(src).toContain("import('@/app/runtime/nativeBiometricBridge')");
    });

    it('حدث quantum لا يُعاد تصديره من useIncrementalCalendarSync (كان يسمّم Runtime)', () => {
        const sync = fs.readFileSync(
            path.join(root, 'src/app/hooks/useIncrementalCalendarSync.ts'),
            'utf8',
        );
        expect(sync).not.toContain("export { QUANTUM_TASKS_CHANGED_EVENT }");
        expect(sync).toContain("from '@/app/utils/quantumTasksEvents'");
        const orch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        expect(orch).toContain("from '@/app/services/settings/defaults'");
        expect(orch).not.toMatch(/LAWYER_SETTINGS_V2_DEFAULTS \} from '@\/app\/services\/settings'/);
    });
});

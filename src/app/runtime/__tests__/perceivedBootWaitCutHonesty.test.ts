import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('perceived boot wait cut honesty', () => {
    it('deferred styles بلا rAF مزدوج؛ الجدولة بعد content-ready لا من أول بايت', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/runtime/deferredAppStyles.ts'), 'utf8');
        expect(src).toContain('void startDeferredAppStylesLoad()');
        expect(src).not.toMatch(/requestAnimationFrame\(\(\)\s*=>\s*\{\s*requestAnimationFrame\(load\)/);
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('onBootContentReady');
        expect(index).toContain('scheduleDeferredAppStyles');
        expect(index).toContain('لا ينافس HomeTab');
        expect(index).not.toMatch(
            /critical-shell\.css';\s*\n\s*void import\('@\/app\/runtime\/deferredAppStyles'\)\.then\(\(m\)\s*=>\s*\{\s*\n\s*m\.scheduleDeferredAppStyles\(\);/,
        );
    });

    it('bootReveal يقطع بكشف أقصر (microtask + first-tab)', () => {
        const reveal = fs.readFileSync(path.join(root, 'src/app/bootstrap/bootReveal.ts'), 'utf8');
        expect(reveal).toContain('queueMicrotask(fire)');
        expect(reveal).not.toMatch(
            /requestAnimationFrame\(fire\)/,
        );
        expect(reveal).toContain('FIRST_TAB_OPEN_EVENT');
        expect(reveal).toContain('first-tab-open');
        expect(reveal).toContain('stylesDeferMs');
        expect(reveal).toContain('startStylesRace');
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

    it('vite يعزل lazyWithRetry عن HomeTab حتى لا يُحجب InnerRuntime', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("'/src/app/utils/lazy/lazyWithRetry'");
        expect(vite).toContain("'app-lazy-with-retry'");
        const pinIdx = vite.indexOf("'/src/app/utils/lazy/lazyWithRetry'");
        const homeTabIdx = vite.indexOf("'/dashboard/LawyerDashboardHomeTab'");
        expect(pinIdx).toBeGreaterThan(-1);
        expect(homeTabIdx).toBeGreaterThan(-1);
    });

    it('vite يفك boot-ui mega — nativePlatform/settingsRuntime خارج الحزمة الضخمة', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("'app-native-platform'");
        expect(vite).toContain("'app-settings-runtime-lite'");
        expect(vite).toContain("'app-settings-apply'");
        expect(vite).toContain("'app-settings-builtin'");
        expect(vite).toContain("'app-settings-snapshot'");
        expect(vite).toContain("'app-settings-migrate'");
        expect(vite).toContain("'app-criminal-bridge-event'");
        expect(vite).toContain("'app-native-boot-deferred'");
        expect(vite).toContain("'app-deferred-app-styles'");
        const feature = vite.slice(vite.indexOf('function resolveAppFeatureChunk'));
        expect(feature.indexOf("'/src/app/runtime/nativePlatform.ts'")).toBeLessThan(
            feature.indexOf("return 'boot-ui-primitives'"),
        );
    });

    it('شارة الإشعارات على أول paint من peekLite بلا notificationStore متزامن', () => {
        const notif = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts'),
            'utf8',
        );
        expect(notif).toContain('peekNotificationUnreadCount');
        expect(notif).not.toMatch(/import \{ useNotificationStore \} from '@\/app\/stores\/notificationStore'/);
        expect(notif).toContain("import('@/app/stores/notificationStore')");
        expect(notif).not.toMatch(
            /from '@\/app\/hooks\/lawyerDashboard\/notificationIntentWarm'/,
        );
        expect(notif).toContain("import('@/app/hooks/lawyerDashboard/notificationIntentWarm')");
        const warm = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/notificationIntentWarm.ts'),
            'utf8',
        );
        expect(warm).not.toMatch(/import \{ useNotificationStore \} from '@\/app\/stores\/notificationStore'/);
        expect(warm).toContain('shouldAllowIntentWarmFromDom');
        const effects = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRuntimeEffects.ts'),
            'utf8',
        );
        expect(effects).not.toMatch(/import \{ useNotificationStore \} from '@\/app\/stores\/notificationStore'/);
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("'app-notification-intent-warm'");
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
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain("from '@/app/services/settings/settingsSnapshot'");
        expect(index).not.toContain("from '@/app/services/settings/settingsRuntime'");
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
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain("'app-quantum-tasks-events'");
        expect(vite).toContain("'app-quantum-tasks-storage'");
        const orch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        expect(orch).toContain("from '@/app/services/settings/defaults'");
        expect(orch).not.toMatch(/LAWYER_SETTINGS_V2_DEFAULTS \} from '@\/app\/services\/settings'/);
    });
});

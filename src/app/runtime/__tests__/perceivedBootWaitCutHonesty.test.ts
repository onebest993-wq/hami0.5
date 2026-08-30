import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readHomeTabImplSource } from './readHomeTabImplSource';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('perceived boot wait cut honesty', () => {
    it('deferred styles بلا rAF مزدوج؛ تبدأ تحت الغطاء من preamble لا من index.html', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/runtime/deferredAppStyles.ts'), 'utf8');
        expect(src).toContain('void startDeferredAppStylesLoad()');
        expect(src).not.toMatch(/requestAnimationFrame\(\(\)\s*=>\s*\{\s*requestAnimationFrame\(load\)/);
        const preamble = fs.readFileSync(path.join(root, 'src/boot/bootEntryPreamble.ts'), 'utf8');
        expect(preamble).toContain('ensureDeferredAppStylesLoaded');
        expect(preamble).toContain('onBootContentReady');
        expect(preamble).toContain('scheduleDeferredAppStyles');
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).toContain('bootEntryPreamble');
        expect(index).toContain('kickoffBootCriticalPreload');
        expect(index).not.toContain("import('@/boot/mountApplication')");
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain('startApplicationBoot');
        expect(index).not.toMatch(
            /critical-shell\.css';\s*\n\s*void import\('@\/app\/runtime\/deferredAppStyles'\)\.then\(\(m\)\s*=>\s*\{\s*\n\s*m\.scheduleDeferredAppStyles\(\);/,
        );
        const gate = fs.readFileSync(path.join(root, 'src/app/bootstrap/homeMainGridPaintGate.ts'), 'utf8');
        expect(gate).toContain('ensureDeferredAppStylesLoaded');
        expect(gate).toContain('DEFERRED_STYLE_HANG_MS');
        expect(gate).not.toContain('DEFERRED_STYLE_SETTLE_MS');
    });

    it('bootReveal يكشف عند first-tab؛ deferred-app/dock بالتوازي بلا حجب', () => {
        const reveal = fs.readFileSync(path.join(root, 'src/app/bootstrap/bootReveal.ts'), 'utf8');
        expect(reveal).toContain('queueMicrotask(fire)');
        expect(reveal).toContain('FIRST_TAB_OPEN_EVENT');
        const events = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/bootEventNames.ts'),
            'utf8',
        );
        expect(events).toContain("export const FIRST_TAB_OPEN_EVENT");
        expect(reveal).toContain('shellPaintedReady');
        expect(reveal).toContain('return shellPaintedReady');
        expect(reveal).toContain('finishAfterStablePaint');
        expect(reveal).toContain('stylesDeferMs');
        expect(reveal).toContain('startStylesRace');
        expect(reveal).not.toContain('waitForHomeDockBootChunk');
        expect(reveal).not.toContain('homeDockBootGate');
        expect(reveal).toContain("performance.getEntriesByName('hami:boot:first-tab-open', 'mark')");
    });

    it('Inner يحمّل FullBoot فوراً تحت الطبقة؛ الكشف من MainView لا من Minimal', () => {
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        expect(inner).not.toContain('warmLawyerDashboardFirstTabChunks');
        expect(inner).not.toContain('syncLawyerVerificationFromServer');
        expect(inner).toContain('LawyerDashboardFullBootPath');
        expect(inner).not.toContain('LawyerDashboardStemInstantBridge');
        expect(inner).not.toContain('LazyLawyerDashboardFullBootPath');
        expect(inner).not.toContain('loadLawyerDashboardMinimalBoot');
        expect(inner).not.toContain('mountFullBoot = afterFirstTabOpen');
        expect(inner).not.toContain('LawyerDashboardHomeFirstPaint');
        const fullBoot = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx'),
            'utf8',
        );
        expect(fullBoot).not.toContain('LawyerDashboardHomeFirstPaint');
        expect(fullBoot).not.toContain('showHomeFirstPaint');
        const stem = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboard.tsx'),
            'utf8',
        );
        expect(stem).not.toContain('warmLawyerDashboardFirstTabChunks');
        expect(stem).not.toContain('markDashboardInteractiveOnce');
        expect(stem).toContain('LawyerDashboardStemInstantBridge');
        expect(stem).toContain('LazyLawyerDashboardInner');
        expect(stem).not.toMatch(
            /import \{[^}]*LawyerDashboardInner[^}]*\} from '@\/app\/components\/lawyer\/dashboard\/LawyerDashboardInner'/,
        );
        const warm = fs.readFileSync(
            path.join(root, 'src/app/runtime/lawyerDashboardFirstTabWarm.ts'),
            'utf8',
        );
        expect(warm).not.toContain('warmLawyerDashboardMinimalHomeChunks');
        expect(warm).not.toContain('warmLawyerDashboardFirstTabChunks');
        expect(warm).toContain('warmLawyerDashboardFullBootChunks');
        expect(warm).toContain("import('@/app/components/lawyer/dashboard/LawyerDashboardMainView')");
        expect(warm).not.toContain('prefetchLawyerDashboardMinimalBoot');
        expect(warm).not.toContain('minimalBootLoader');
        expect(warm).not.toContain('prefetchLawyerDashboardInnerRuntime');
        expect(warm).not.toContain('innerRuntimeLoader');
        expect(warm).not.toContain('prefetchLawyerHomeHubCardModule');
        expect(warm).not.toContain('HomeHubSecretaryPanel');
        expect(warm).toContain('prefetchCommandHubTiles');
        expect(warm).toContain('prefetchHomeTabContent');
        expect(warm).not.toMatch(
            /import \{ prefetchCommandHubTiles \} from '@\/app\/runtime\/commandHubTilesLoader'/,
        );
        expect(warm).not.toMatch(
            /import \{ prefetchHomeTabContent \} from '@\/app\/runtime\/homeTabContentLoader'/,
        );
        expect(warm).not.toContain('onDashboardInteractive');
        const index = fs.readFileSync(path.join(root, 'src/index.tsx'), 'utf8');
        expect(index).not.toContain(
            "import('@/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime')",
        );
        const postWarm = fs.readFileSync(
            path.join(root, 'src/app/runtime/dashboardPostInteractiveWarm.ts'),
            'utf8',
        );
        expect(postWarm).toContain('onBootContentReady');
        expect(postWarm).not.toContain('hami:dashboard-interactive');
        expect(postWarm).toContain('prefetchLawyerHomeHubCardModule');
        expect(postWarm).toContain("import('@/app/runtime/profileInstantPaint')");
        expect(postWarm).toContain('isSectionBackgroundPrefetchAllowed');
        expect(postWarm).not.toContain("settings/settingsRuntime");
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain('homeHubCardLoader');
        expect(preload).toContain('prefetchLawyerHomeHubCardModule');
        const main = readLawyerDashboardMainViewSurface();
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
        const hydration = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/useLawyerSettingsHydration.ts'),
            'utf8',
        );
        expect(provider).toContain('useLawyerSettingsHydration');
        expect(hydration).not.toMatch(/useLayoutEffect\(\(\)\s*=>\s*\{[\s\S]*loadInitialSettings/);
        expect(hydration).toContain('useEffect(() => {');
        expect(hydration).toContain('loadInitialSettingsAsync()');
    });

    it('جسر الجنائي يتأخر إطاراً بعد أول رسم — داخل FullBootPath لا minimal', () => {
        const fullBoot = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardFullBootPath.tsx'),
            'utf8',
        );
        expect(fullBoot).toContain('bridgeLive');
        expect(fullBoot).toContain('backgroundRuntime && bridgeLive');
        const inner = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInner.tsx'),
            'utf8',
        );
        expect(inner).not.toContain('CriminalDashboardBridgeProvider');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardInnerRuntime.tsx'),
            ),
        ).toBe(false);
    });

    it('HomeTab: Hub كسول عبر homeHubCardLoader — لا استيراد sync على الإغلاق', () => {
        const home = readHomeTabImplSource(root);
        expect(home).toContain('LazyLawyerHomeHubCard');
        expect(home).toContain('loadLawyerHomeHubCardModule');
        expect(home).toContain('ExecutionHero');
        expect(home).toContain('useCommandHubTiles');
        expect(home).not.toMatch(
            /import\s*\{[^}]*ExecutionHero[^}]*\}\s*from\s*['"]@\/app\/components\/lawyer\/dashboard\/commandHub['"]/,
        );
        expect(home).not.toMatch(
            /import\s*\{[^}]*LawyerHomeHubCard[^}]*\}\s*from\s*['"]@\/app\/components\/lawyer\/LawyerHomeHubCard['"]/,
        );
        expect(home).toContain('useHomeMainGridSlots');
        expect(home).not.toContain('useLawyerSettingsHomeLayout');
        expect(home).not.toContain('useLawyerSettingsAppearance');
        expect(home).not.toMatch(/useLawyerSettings\(\)/);
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('experimentalMinChunkSize');
        expect(vite).toContain("'vendor-zustand'");
        expect(vite).toContain("return 'lawyer-home-tab-content'");
    });

    it('vite يفصل vendor-zustand و boot-runtime عن المسار الحرج', () => {
        const vite = fs.readFileSync(path.join(root, 'vite.config.mts'), 'utf8');
        expect(vite).toContain('resolveBootRuntimeChunk');
        expect(vite).toContain("return 'vendor-zustand'");
        expect(vite).toContain('vendor-react|boot-runtime');
        expect(vite).toContain("return 'vendor-ui'");
        expect(vite).toContain("return 'vendor-lucide'");
        expect(vite).toContain('/lucide-react/dist/esm/createLucideIcon');
        expect(vite).toContain('/lucide-react/dist/esm/defaultAttributes');
        expect(vite).not.toContain("return 'lawyer-lucide-icons'");
        expect(vite).toContain('/aria-hidden/');
        const radixBlock = vite.slice(
            vite.indexOf("normalized.includes('/@radix-ui/')"),
            vite.indexOf("return 'vendor-ui'"),
        );
        expect(radixBlock).not.toContain('lucide-react');
        expect(vite).toContain('/motion-dom/');
        expect(vite).toContain('/motion-utils/');
        expect(vite).toContain('/@floating-ui/');
        expect(vite).toContain('/tslib/');
        expect(vite).toMatch(/SmartToast\\\.\(ts\|tsx\|js\|jsx\)/);
        expect(vite).not.toMatch(/\/ui\/SmartToast['`,]/);
        const lock = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/AppLockOverlay.tsx'),
            'utf8',
        );
        expect(lock).toContain('bootStemIcons');
        expect(lock).not.toContain('lucide-react');
        expect(lock).not.toContain('lucideIcons');
        const pwd = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/lawyerAuth/AuthPasswordField.tsx'),
            'utf8',
        );
        expect(pwd).toContain('bootStemIcons');
        expect(pwd).not.toContain('lucide-react');
        expect(pwd).not.toContain('lucideIcons');
        const homeTab = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab.ts'),
            'utf8',
        );
        expect(homeTab).toMatch(/markHomeHubPerfPhase\('open-request'\)/);
        expect(homeTab).toMatch(
            /useEffect\(\(\) => \{\s*if \(activeTab !== 'home'\) return;\s*primeHomeTabMount\(\);/,
        );
        expect(homeTab).toContain('isDashboardInteractive');
        expect(homeTab).toContain('onDashboardInteractive');
        const searchHeader = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/components/SearchHeader.tsx',
            ),
            'utf8',
        );
        expect(searchHeader).toContain('homeStemIcons');
        expect(searchHeader).not.toContain('lucideIcons');
        const pre = fs.readFileSync(
            path.join(
                root,
                'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts',
            ),
            'utf8',
        );
        expect(pre).not.toMatch(/useCaseStore\(\(s\) => s\.cases\)/);
        expect(pre).not.toMatch(/useCaseStore\(\(s\) => s\.selectCase\)/);
        expect(pre).not.toContain("from '@/app/stores/caseStore'");
        expect(pre).toContain("import('@/app/stores/caseStore')");
        expect(pre).not.toContain('hydrateCasesFromLawsuitFiles');
        expect(pre).toContain('useAppLock');
        const paintGate = fs.readFileSync(
            path.join(root, 'src/app/bootstrap/homeMainGridPaintGate.ts'),
            'utf8',
        );
        expect(paintGate).not.toMatch(
            /import\s*\{[^}]*beforeBootShellReveal[^}]*\}\s*from\s*['"]@\/app\/bootstrap\/BootLaunchOrchestrator['"]/,
        );
        expect(paintGate).toContain("import('@/app/bootstrap/BootLaunchOrchestrator')");
        expect(paintGate).toContain('beforeBootShellReveal');
        const overlays = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardOverlays.ts'),
            'utf8',
        );
        expect(overlays).toContain("from '@/app/runtime/lawsuitWorkspaceEvents'");
        expect(overlays).not.toMatch(/from '@\/app\/runtime\/lawsuitWorkspaceWarm'/);
        expect(overlays).not.toMatch(/from '@\/app\/runtime\/executionArchiveOpenSession'/);
        expect(overlays).toContain("import('@/app/runtime/executionArchiveOpenSession')");
        const criticalShell = fs.readFileSync(
            path.join(root, 'src/styles/critical-shell.css'),
            'utf8',
        );
        expect(criticalShell).not.toContain('homeHubCardFx.css');
        expect(criticalShell).not.toContain('profileChrome.css');
        expect(criticalShell).not.toContain('forumPlumChrome.css');
        expect(criticalShell).not.toContain('radarFormCritical.css');
        expect(criticalShell).toContain('appLockOverlay.css');
        const headerTrigger = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter.tsx',
            ),
            'utf8',
        );
        expect(headerTrigger).not.toContain('revealProfileWarmShell');
        expect(headerTrigger).toContain("from '@/app/runtime/profileInstantPaint'");
        expect(headerTrigger).not.toContain('snapProfileShellOpen');
        expect(headerTrigger).toContain('data-identity-settled');
        expect(headerTrigger).toContain('data-avatar-expected');
        expect(headerTrigger).not.toContain('holdLetterUntilAvatarSettles');
        const forumCold = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/commandHub/ForumTile.tsx',
            ),
            'utf8',
        );
        expect(forumCold).toContain('ForumTileProfileQuarterSlot');
        expect(forumCold).not.toContain('revealProfileWarmShell');
        const forumSlot = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterSlot.tsx',
            ),
            'utf8',
        );
        expect(forumSlot).toContain('LazyForumTileProfileQuarter');
        expect(forumSlot).toContain('HOME_MAIN_GRID_PAINTED_EVENT');
        expect(forumSlot).toContain('allowQuarterChunk');
        expect(forumSlot).not.toContain('export { loadForumTileProfileQuarter }');
        expect(forumCold).not.toContain('HOME_MAIN_GRID_PAINTED_EVENT');
        expect(forumCold).not.toContain('loadForumTileProfileQuarter');
        const tilesLoader = fs.readFileSync(
            path.join(root, 'src/app/runtime/commandHubTilesLoader.ts'),
            'utf8',
        );
        expect(tilesLoader).not.toContain('prefetchForumTileProfileQuarterModule');
        const overlayWarm = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(overlayWarm).not.toContain('prefetchCommunityOverlayEntry');
        const bridgeLazy = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/criminal-system/criminalDashboardBridgeLazy.tsx',
            ),
            'utf8',
        );
        expect(bridgeLazy).toContain('HOME_MAIN_GRID_PAINTED_EVENT');
        expect(bridgeLazy).toContain('isHomeMainGridPaintedNow');
        expect(bridgeLazy).toContain('startIdleAttach');
        const searchBridge = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchBridgeShellContent.ts',
            ),
            'utf8',
        );
        expect(searchBridge).toContain('peekGlobalSearchRecentSearches');
        expect(searchBridge).not.toContain('readGlobalSearchRecentSearchesSync');
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
        const hostLife = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/notifications/useNotificationHostLifecycle.ts'),
            'utf8',
        );
        expect(hostLife).not.toMatch(/import \{ useNotificationStore \} from '@\/app\/stores\/notificationStore'/);
        expect(hostLife).toContain("import('@/app/stores/notificationStore')");
        expect(hostLife).toContain("from '@/app/runtime/notificationBootEvents'");
        expect(hostLife).not.toMatch(/from '@\/app\/runtime\/notificationBootHydrator'/);
        expect(sync).toContain('onDashboardInteractive');
        const effects = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRuntimeEffects.ts'),
            'utf8',
        );
        expect(effects).not.toMatch(/import \{ useNotificationStore \} from '@\/app\/stores\/notificationStore'/);
        expect(effects).not.toMatch(/import \{ useCaseStore \} from '@\/app\/stores\/caseStore'/);
        expect(effects).toContain("import('@/app/stores/caseStore')");
        const openFlow = fs.readFileSync(
            path.join(
                root,
                'src/app/hooks/lawyerDashboard/notifications/notificationShellOpenFlow.ts',
            ),
            'utf8',
        );
        expect(openFlow).not.toMatch(/import \{ useNotificationStore \} from '@\/app\/stores\/notificationStore'/);
        expect(openFlow).toContain("import('@/app/stores/notificationStore')");
        const main = readLawyerDashboardMainViewSurface();
        expect(main).toContain('GlobalSearchOverlaySuspenseCover');
        expect(main).not.toContain('GlobalSearchInstantShell');
    });

    it('case-shares على أول paint من peekLite بلا CaseShareApiService متزامن ولا ترحيل leftover', () => {
        const shares = fs.readFileSync(path.join(root, 'src/app/hooks/useIncomingCaseShares.ts'), 'utf8');
        expect(shares).toContain('peekCaseSharePendingCount');
        expect(shares).not.toMatch(
            /import \{ CaseShareApiService \} from '@\/app\/services\/caseShare\/caseShareApiService'/,
        );
        expect(shares).toContain("import('@/app/services/caseShare/caseShareApiService')");
        expect(shares).toContain('localPeekOnly');
        const dashNotif = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardNotifications.ts'),
            'utf8',
        );
        expect(dashNotif).toContain('localPeekOnly: true');
        const peekLite = fs.readFileSync(
            path.join(root, 'src/app/services/caseShare/caseSharePeekLite.ts'),
            'utf8',
        );
        expect(peekLite).toContain('peekSecureOrLegacySync');
        expect(peekLite).not.toMatch(/readSecureOrDrainLegacySync\(/);
        expect(peekLite).not.toContain('setItemSync');
        const notifPeek = fs.readFileSync(
            path.join(root, 'src/app/infrastructure/notificationPeekLite.ts'),
            'utf8',
        );
        expect(notifPeek).toContain('peekSecureOrLegacySync');
        expect(notifPeek).not.toMatch(/readSecureOrDrainLegacySync\(/);
        const wsHeavy = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardWorkspaceHeavy.ts'),
            'utf8',
        );
        expect(wsHeavy).not.toMatch(
            /import \{ unpinWorkspaceForDeletedFile \} from '@\/app\/workspace\/unpinWorkspaceEntity'/,
        );
        expect(wsHeavy).toContain("import('@/app/workspace/unpinWorkspaceEntity')");
        const orch = [
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
                'utf8',
            ),
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
                'utf8',
            ),
        ].join('\n');
        expect(orch).not.toMatch(/from '@\/app\/hooks\/useLawsuitFileMutations'/);
        expect(orch).not.toMatch(/from '@\/app\/hooks\/useLawyerExecutionFiles'/);
        expect(orch).toContain('LawyerDashboardWorkspaceProviderParams');
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
        const hydration = fs.readFileSync(
            path.join(root, 'src/app/context/lawyerSettings/useLawyerSettingsHydration.ts'),
            'utf8',
        );
        expect(provider).toContain('useLawyerSettingsHydration');
        expect(hydration).toContain('onBootContentReady');
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
        const src = [
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
                'utf8',
            ),
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
                'utf8',
            ),
        ].join('\n');
        expect(src).toContain("from '@/app/components/lawyer/lawyerThemeStyles'");
        expect(src).not.toContain("useThemeStyles } from '@/app/components/lawyer/LawyerShared'");
        expect(src).not.toContain("useThemeStyles } from \"@/app/components/lawyer/LawyerShared\"");
        expect(src).toContain("from '@/app/services/settings/cloudSyncBucket'");
        expect(src).not.toContain("from '@/app/services/settings/settingsRuntime'");
    });

    it('useAppLock لا يسحب nativeBiometricBridge بشكل متزامن إلى stem', () => {
        const src = fs.readFileSync(path.join(root, 'src/app/hooks/useAppLock.ts'), 'utf8');
        expect(src).not.toMatch(/import \{[^}]*hasNativeBiometricEnrollment[^}]*\} from '@\/app\/runtime\/nativeBiometricBridge'/);
        expect(src).toContain("import('@/app/runtime/nativeBiometricBridge')");
        expect(src).toContain('HAMI_APP_STATE_EVENT');
        expect(src).toContain('isBiometricWorkspaceUnlocked');
    });

    it('حدث quantum لا يُعاد تصديره من useIncrementalCalendarSync (كان يسمّم Runtime)', () => {
        const sync = fs.readFileSync(
            path.join(root, 'src/app/hooks/useIncrementalCalendarSync.ts'),
            'utf8',
        );
        expect(sync).not.toContain("export { QUANTUM_TASKS_CHANGED_EVENT }");
        expect(sync).toContain("from '@/app/utils/quantumTasksEvents'");
        const orch = [
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
                'utf8',
            ),
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
                'utf8',
            ),
        ].join('\n');
        expect(orch).toContain("from '@/app/services/settings/defaults'");
        expect(orch).not.toMatch(/LAWYER_SETTINGS_V2_DEFAULTS \} from '@\/app\/services\/settings'/);
    });
});

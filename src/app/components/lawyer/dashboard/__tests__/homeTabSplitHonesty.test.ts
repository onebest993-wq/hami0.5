import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readHomeTabImplSource } from '@/app/runtime/__tests__/readHomeTabImplSource';

const dir = resolve(process.cwd(), 'src/app/components/lawyer/dashboard');
const runtime = resolve(process.cwd(), 'src/app/runtime');

describe('home tab file split', () => {
    it('الغلاف يملك التمرير والحدود؛ المحتوى في HomeTabContent', () => {
        const wrap = readFileSync(resolve(dir, 'LawyerDashboardHomeTab.tsx'), 'utf8');
        const content = readFileSync(resolve(dir, 'HomeTabContent.tsx'), 'utf8');
        expect(wrap).toContain('HomeTabPaintShell');
        expect(wrap).toContain('LawyerHomeTabErrorBoundary');
        expect(wrap).toContain('getHomeTabContentSync');
        expect(wrap).not.toContain('getCommandHubTilesSync');
        expect(wrap).not.toContain('subscribeCommandHubTiles');
        expect(wrap).not.toContain('loadCommandHubTiles');
        expect(wrap).toContain('loadHomeTabContent');
        expect(wrap).toContain('HomeMainGridFirstPaint');
        expect(wrap).toContain('activateHomeFirstPaintWidget');
        const model = readFileSync(resolve(dir, 'useHomeTabContentModel.ts'), 'utf8');
        expect(model).toContain('peekFrame1Hydrate');
        expect(model).toContain('peekDashboardFrame1Snapshot');
        expect(model).toContain('consumePendingAlertsDockOpen');
        expect(model).not.toMatch(/forumUnreadCount,\s*setForumUnreadCount\] = useState\(\s*0\s*\)/);
        expect(model).not.toMatch(/\[pinnedCount, setPinnedCount\] = useState\(0\)/);
        expect(model).not.toMatch(/\[urgentAlertsCount, setUrgentAlertsCount\] = useState\(0\)/);
        expect(wrap).not.toMatch(/from ['"]\.\/HomeTabContent['"]/);
        expect(wrap).toContain('announceBootReveal');
        expect(wrap).not.toContain('LazyLawyerHomeHubCard');
        expect(wrap).not.toContain('ExecutionHero');
        expect(wrap).not.toContain('lazyWithRetry');
        expect(content).toContain('useHomeTabContentModel');
        expect(content).toContain('HomeTabWidgetSlot');
        expect(content).toContain('HomeMainGrid');
        expect(content).not.toContain('onLoadingChange');
        expect(model).not.toContain('forumUnreadLoading');
        expect(model).not.toContain('onForumUnreadLoading');
        expect(content).toContain('announcePaint={model.announceBootReveal}');
        const impl = readHomeTabImplSource();
        expect(impl).toContain('LazyLawyerHomeHubCard');
        expect(impl).toContain('ExecutionHero');
        expect(content).not.toContain('setHubTiles');
        expect(content).not.toContain('HomeLayoutScrollRoot');
        expect(content).not.toContain('LawyerHomeTabErrorBoundary');
        expect(content).not.toMatch(
            /import \{ prefetchDockWidgetIntent \} from/,
        );
        expect(content).not.toContain("from '@/app/hooks/lawyerDashboard/hubArchivePrefetchGate'");
        expect(content).not.toContain("from '@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch'");
    });

    it('الكشف من الشبكة الحقيقية فقط؛ الهيكل لا يعلن البحر', () => {
        const firstPaint = readFileSync(resolve(dir, 'HomeMainGridFirstPaint.tsx'), 'utf8');
        const grid = readFileSync(resolve(dir, 'HomeMainGrid.tsx'), 'utf8');
        const main = readFileSync(resolve(dir, 'LawyerDashboardMainView.tsx'), 'utf8');
        const slots = readFileSync(resolve(dir, 'useHomeMainGridSlots.ts'), 'utf8');
        const hubSkeleton = readFileSync(resolve(dir, 'HomeHubCardSkeleton.tsx'), 'utf8');
        const warm = readFileSync(resolve(runtime, 'lawyerDashboardFirstTabWarm.ts'), 'utf8');
        const inner = readFileSync(resolve(dir, 'LawyerDashboardInner.tsx'), 'utf8');
        expect(firstPaint).toContain('HomeMainGrid');
        expect(firstPaint).toMatch(/\buseHomeMainGridSlots\s*\(/);
        expect(firstPaint).not.toContain('prefetchHomeTabContent');
        expect(firstPaint).not.toContain('prefetchCommandHubTiles');
        expect(firstPaint).not.toContain('prefetchLawyerHomeHubCardModule');
        expect(firstPaint).toContain('announcePaint={false}');
        expect(firstPaint).not.toContain('ExecutionHero');
        expect(grid).not.toMatch(/\buseHomeMainGridSlots\s*\(/);
        expect(grid).toContain('announcePaint');
        expect(grid).toContain('scheduleHomeMainGridPainted');
        expect(grid).toContain('if (!visible) return');
        expect(grid).toContain("if (announcePaint) scheduleHomeMainGridPainted");
        expect(grid).not.toContain('prefetchCommandHubTiles');
        expect(grid).toContain("from '@/app/bootstrap/homeMainGridPaintAnnounce'");
        expect(grid).not.toContain("from '@/app/bootstrap/homeMainGridPaintGate'");
        const announce = readFileSync(
            resolve(process.cwd(), 'src/app/bootstrap/homeMainGridPaintAnnounce.ts'),
            'utf8',
        );
        expect(announce).not.toContain('isHomeHubGeometryReady');
        expect(announce).toContain('isHomeGridRevealReady');
        expect(announce).toContain('publishHeaderOffsetFromDom');
        expect(announce).toContain('isHeaderOffsetReady');
        expect(main).toContain('announceBootReveal');
        expect(slots).toContain('resolveWidgetSpan(widgetId, overrides[widgetId])');
        expect(slots).not.toContain("widgetId === 'forum' ? 2");
        expect(hubSkeleton).toContain('home-hub-card-skeleton');
        expect(hubSkeleton).toContain('hami-hub-tabs');
        expect(hubSkeleton).toContain('hami-hub-readable-panels');
        expect(hubSkeleton).not.toContain('hami-hub-skeleton-tabs');
        expect(hubSkeleton).not.toContain('hami-sovereign-glass');
        expect(warm).toContain('prefetchCommandHubTiles');
        expect(inner).toContain('LawyerDashboardFullBootPath');
        expect(inner).not.toContain('LazyLawyerDashboardFullBootPath');
        expect(inner).not.toContain('loadLawyerDashboardMinimalBoot');
        expect(inner).not.toContain('mountFullBoot');
        expect(grid).not.toContain('isHomeDestinationRevealedInSession');
        expect(grid).not.toContain('hami-home-destination-reveal');
        expect(grid).not.toContain('grid grid-cols-2');
        expect(firstPaint).toContain('data-hami-home-first-paint-layer');
        expect(firstPaint).not.toContain('data-hami-home-destination-ready');
    });

    it('حاويات المنزل بلا dockSticky/reveal ميت أو CSS مكرّر', () => {
        const scroll = readFileSync(resolve(dir, 'HomeLayoutScrollRoot.tsx'), 'utf8');
        const css = readFileSync(resolve(dir, 'lawyerHomeFx-critical.css'), 'utf8');
        const content = readFileSync(resolve(dir, 'HomeTabContent.tsx'), 'utf8');
        const grid = readFileSync(resolve(dir, 'HomeMainGrid.tsx'), 'utf8');
        const paintShell = readFileSync(resolve(dir, 'HomeTabPaintShell.tsx'), 'utf8');
        expect(paintShell).toContain('HomeLayoutScrollRoot');
        expect(paintShell).toContain('hami-below-lawyer-header');
        expect(scroll).toContain('bindHomeScrollPacing');
        expect(scroll).not.toContain('useHomePageScroll');
        expect(scroll).not.toContain('resolveHomeDockSticky');
        expect(scroll).not.toContain('dockSticky');
        expect(content).not.toContain('data-hami-home-destination-ready');
        const model = readFileSync(resolve(dir, 'useHomeTabContentModel.ts'), 'utf8');
        expect(model).toMatch(/\buseHomeMainGridSlots\s*\(/);
        expect(content).not.toMatch(/\buseHomeMainGridSlots\s*\(/);
        expect(grid).not.toMatch(/\buseHomeMainGridSlots\s*\(/);
        expect(content).not.toContain('filterDisplayHomeWidgets');
        expect(content).not.toContain('useLawyerSettingsHomeLayout');
        expect(css).not.toContain('hami-home-destination-reveal');
        expect(css).not.toContain('.hami-home-dock-zone');
        expect(css).not.toContain('.hami-home-flow-end-pad');
        expect(css).not.toContain('--hami-home-dock-scroll-pad');
        expect(css).not.toMatch(/\[data-testid='home-main-grid'\]\s*>\s*\.col-span-2/);
        const types = readFileSync(resolve(dir, 'lawyerDashboardHomeTab.types.ts'), 'utf8');
        const shell = readFileSync(resolve(dir, 'lawyerShellLayout.ts'), 'utf8');
        expect(types).not.toContain('homeTabSessionKey');
        expect(types).not.toContain('homeDockChromeSessionKey');
        expect(types).not.toContain('fieldTasksSheetOpen');
        expect(types).not.toContain('showTasksManager');
        expect(types).not.toContain('shapeClass');
        expect(content).not.toContain('fieldTasksSheetOpen');
        expect(content).not.toContain('showTasksManager');
        expect(content).not.toContain('export type { LawyerDashboardHomeTabProps }');
        expect(grid).not.toContain('data-hami-boot-reveal-grid');
        expect(shell).toContain("HAMI_SHELL_CONTAINER = 'hami-shell-container'");
        expect(shell).not.toContain('w-full mx-auto');
    });

    it('HomeTab/commandHub بلا استيراد ساكن لعناقيد التنفيذ/الإعدادات/الملف', () => {
        const content = readHomeTabImplSource();
        const chrome = readFileSync(resolve(dir, 'commandHub/commandHubTileChrome.tsx'), 'utf8');
        const archivePrefetch = readFileSync(
            resolve(dir, 'commandHub/commandHubArchivePrefetch.ts'),
            'utf8',
        );
        const dock = readFileSync(resolve(dir, 'useCommandCenterDockActions.ts'), 'utf8');
        const hubOpen = readFileSync(
            resolve(process.cwd(), 'src/app/services/hub/hubHomeOpen.ts'),
            'utf8',
        );
        const forbidden = [
            'execution-handler',
            'archive-portal',
            'HamiSettings',
            'RoyalLawyerProfile',
            'vendor-supabase',
        ];
        for (const file of [content, chrome, archivePrefetch, dock, hubOpen]) {
            for (const needle of forbidden) {
                expect(file).not.toContain(needle);
            }
        }
        /* البوابة تُستورد ساكناً من محوّلي hover والفتح فقط — لا من HomeTab/chrome/dock */
        for (const file of [content, chrome, dock]) {
            expect(file).not.toMatch(
                /import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]@\/app\/hooks\/lawyerDashboard\/hubArchivePrefetchGate['"]/,
            );
        }
        expect(archivePrefetch).toMatch(
            /import\s+\{[^}]*prefetchHubArchiveIntentDebounced[^}]*\}\s+from\s+['"]@\/app\/hooks\/lawyerDashboard\/hubArchivePrefetchGate['"]/,
        );
        expect(hubOpen).toMatch(
            /import\s+\{[^}]*prefetchHubArchiveIntentImmediate[^}]*\}\s+from\s+['"]@\/app\/hooks\/lawyerDashboard\/hubArchivePrefetchGate['"]/,
        );
        expect(content).toContain('ExecutionHero');
        expect(content).toContain('DockHalfTile');
        expect(content).toContain('ForumTile');
        expect(content).toContain('HomeHubHomeSlot');
        expect(content).toContain('RouteTile');
        const vite = readFileSync(resolve(process.cwd(), 'vite.config.mts'), 'utf8');
        expect(vite).toContain("return 'lawyer-home-paint'");
        expect(vite).toContain('/src/app/components/lawyer/dashboard/LawyerDashboardHomeTab');
        expect(vite).toContain('/src/app/components/lawyer/dashboard/HomeTabPaintShell');
        expect(vite).toContain("return 'lawyer-home-tab-content'");
        expect(vite).toContain('/src/app/components/lawyer/dashboard/HomeTabWidgetSlot');
        expect(vite).toContain('/src/app/components/lawyer/dashboard/HomeHubHomeSlot');
        expect(vite).toContain('/src/app/components/lawyer/dashboard/useHomeTabContentModel');
        expect(vite).toContain("return 'lawyer-home-command-hub'");
        expect(vite).toContain("return 'lawyer-home-forum-profile'");
        expect(vite).toContain('/src/app/components/lawyer/dashboard/forumProfile/');
        expect(vite).toContain("return 'lawyer-home-hub-card'");
        expect(vite).not.toContain("return 'lawyer-home-hub-secretary'");
        expect(vite).toContain("return 'lawyer-home-hub-overlays'");
        expect(vite).toContain("return 'lawyer-home-hub-pins'");
        expect(vite).toContain("return 'lawyer-home-hub-alerts-feed'");
        expect(vite).toContain("return 'app-workspace-scan-lite'");
        expect(vite).toContain("return 'lawyer-home-stem-icons'");
        expect(vite).toContain("return 'hami-shell-lite'");
        expect(vite).toContain("return 'lawyer-orchestration-lite'");
        expect(vite).toContain("return 'lawyer-workspace-store'");
        expect(vite).toContain("return 'lawyer-file-coerce'");
        expect(vite).toContain("return 'lawyer-lawsuit-lite'");
        expect(vite).toContain("return 'lawyer-quantum-lite'");
        expect(vite).toContain("return 'lawyer-persist'");
        expect(vite).toContain("return 'lawyer-dashboard-canvas'");
        expect(vite).toContain('/src/app/hooks/useReduceMotion');
        expect(vite).toContain('/src/app/utils/bodyScrollLock');
        expect(vite).toContain('/src/app/stores/workspaceStore');
        expect(dock).toContain("import('@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch')");
        expect(archivePrefetch).toContain("import('@/app/runtime/executionArchivePrimeHost')");
    });
});

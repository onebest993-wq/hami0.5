import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

function readGlobalSearchOverlayCss(): string {
    const dir = path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay');
    const barrel = fs.readFileSync(path.join(dir, 'globalSearchOverlay.css'), 'utf8');
    const imports = [...barrel.matchAll(/@import\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
    const parts = imports.map((rel) => fs.readFileSync(path.join(dir, rel), 'utf8'));
    return [barrel, ...parts].join('\n');
}

describe('global search section surgical close honesty', () => {
    it('تنقّل الملف/القضية يمرّر userId الحقيقي لا isRealSignedIn(null)', () => {
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/globalSearchNavDispatch.ts'),
            'utf8',
        );
        expect(nav).toContain('userId: string | null');
        expect(nav).not.toContain('isRealSignedIn(ctx.userId)');
        expect(nav).not.toContain('isRealSignedIn(null)');
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardGlobalSearchNav.ts'),
            'utf8',
        );
        expect(hook).toContain('dispatchGlobalSearchNavigate');
        expect(hook).toContain('userId: userIdRef.current');
    });

    it('DeferredFeatureSurfaces يمرّر userId و criminalCases إلى globalSearchNav', () => {
        const surfaces = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(surfaces).toMatch(
            /useLawyerDashboardGlobalSearchNav\(\{[\s\S]*?userId:\s*params\.userId/,
        );
        expect(surfaces).toContain('criminalCases: params.criminalCases');
    });

    it('MainView يركّب Entry عند show أو searchHostMounted (بعد الفتح لا الهوية)', () => {
        const main = readLawyerDashboardMainViewSurface();
        expect(main).toMatch(/globalSearchLive\s*=/);
        expect(main).toContain('searchHostMounted');
        expect(main).toContain('showGlobalSearch');
        const mainSrc = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(mainSrc).toContain('Host عند الفتح حتى الإغلاق — ليس فور الهوية');
        expect(mainSrc).not.toContain('مثل الإعدادات: hostMounted يُركّب Entry دافئاً قبل أول فتح');
    });

    it('Entry يمرّر keepAlive من searchHostMounted', () => {
        const entry = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardGlobalSearchOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('keepAlive={searchHostMounted}');
        expect(entry).toContain('showGlobalSearch || searchHostMounted');
        expect(entry).toContain('GlobalSearchShellPortal');
        expect(entry).toContain('loadGlobalSearchOverlayHost');
        expect(entry).not.toMatch(
            /from ['"]@\/app\/components\/lawyer\/GlobalSearchOverlay\/GlobalSearchOverlayHost['"]/,
        );
    });

    it('searchHostMounted يبدأ مغلقاً إلا عند استعادة جلسة مفتوحة', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch.ts'),
            'utf8',
        );
        expect(hook).toContain('useState(() => initialSession.open)');
        expect(hook).not.toMatch(/searchHostMounted,\s*setSearchHostMounted\]\s*=\s*useState\(true\)/);
    });

    it('تصنيف البحث مربوط من الجلسة عبر filterGroupedResultsByScope', () => {
        const shell = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayShell.ts',
            ),
            'utf8',
        );
        expect(shell).toContain('filterGroupedResultsByScope');
        expect(shell).toContain('onSearchScopeChange: setSearchScope');
        expect(shell).toContain('searchScope');
    });

    it('DialogChrome يمرّر focusArmed إلى الرأس عبر SheetBody', () => {
        const chrome = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayDialogChrome.tsx',
            ),
            'utf8',
        );
        const sheet = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlaySheetBody.tsx',
            ),
            'utf8',
        );
        expect(chrome).toContain('focusArmed = true');
        expect(chrome).toContain('focusArmed={focusArmed}');
        expect(chrome).toContain('GlobalSearchOverlaySheetBody');
        expect(sheet).toContain('<SearchHeader');
        expect(sheet).toContain('{...header}');
    });

    it('Entry لا يستورد fuse/load بشكل ثابت — probe ديناميكي', () => {
        const entry = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardGlobalSearchOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).not.toContain("from '@/app/services/globalSearchFuse'");
        expect(entry).not.toContain("from '@/app/services/globalSearchLoad'");
        expect(entry).toContain("import('@/app/services/search/globalSearchLocalWarmProbe')");
    });

    it('مسار الهيدر: prefetch على pointerdown + InstantPaintCover أثناء تعليق Entry', () => {
        const trigger = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerDashboardParts/components/HeaderSearchTrigger.tsx',
            ),
            'utf8',
        );
        expect(trigger).toContain('header-search-trigger');
        expect(trigger).toContain('activateOnPointerDown');
        expect(trigger).not.toContain('activateOnPointerDown={false}');
        expect(trigger).toContain('paintGlobalSearchInstantChrome');
        expect(trigger).toContain('beginGlobalSearchDismissLock');
        expect(trigger).not.toContain('setPointerCapture');
        const prefetch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardHeaderPrefetch.ts'),
            'utf8',
        );
        expect(prefetch).toContain('onSearchPointerDown: prefetchSearchPress');
        const main = readLawyerDashboardMainViewSurface();
        expect(main).toContain('LazyGlobalSearchOverlayEntry');
        expect(main).toContain('showGlobalSearch');
        expect(main).toMatch(/globalSearchLive\s*\?[\s\S]*?LazyGlobalSearchOverlayEntry/);
        expect(main).toContain('GlobalSearchInstantPaintCover');
        expect(main).toContain('LazyGlobalSearchInstantPaintCover');
        expect(main).not.toContain('GlobalSearchInstantShell');
        expect(main).toMatch(/showGlobalSearch[\s\S]*?LazyGlobalSearchInstantPaintCover/);
        expect(main).toContain('warmOverlayEntryChunks');
    });

    it('لا رسالة «جاري فتح البحث» — Host=StaticShell وغطاء فوري بلا نتائج ثقيلة', () => {
        const cover = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantPaintCover.tsx',
            ),
            'utf8',
        );
        expect(cover).toContain('GlobalSearchOverlayLayerFrame');
        expect(cover).toContain('GlobalSearchInstantSheetChrome');
        expect(cover).not.toMatch(/import .*ResultRow/);
        expect(cover).not.toMatch(/import .*ResultsBody/);
        expect(cover).not.toMatch(/import .*SearchResultsPanel/);
        expect(cover).not.toMatch(/جاري فتح البحث/);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayPaintShell.tsx'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/LawyerDashboardParts/LazyFallback.tsx'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/LawyerDashboardParts/GlobalSearchLazyFallback.tsx'),
            ),
        ).toBe(false);
        expect(
            fs.existsSync(
                path.join(
                    root,
                    'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayLoadingBridge.tsx',
                ),
            ),
        ).toBe(false);
        const host = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost.tsx',
            ),
            'utf8',
        );
        expect(host).toContain('GlobalSearchOverlayStaticShell');
        expect(host).toContain('headless');
        expect(host).toContain('useGlobalSearchFocusArm');
        expect(host).toContain('keepAlive');
        expect(host).toContain('keepWarm={keepAlive}');
        const staticShell = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayStaticShell.tsx',
            ),
            'utf8',
        );
        expect(staticShell).toContain('GlobalSearchOverlayLayerFrame');
        expect(staticShell).toContain('focusArmed');
        const frame = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayLayerFrame.tsx',
            ),
            'utf8',
        );
        expect(frame).toContain('useOverlayCloseArm');
        expect(frame).toContain('requestClose');
    });

    it('تسخين بلا تركيب Host عند الهوية + تسليم مسودة عبر bridge hook', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch.ts'),
            'utf8',
        );
        const hostLifecycle = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchHostLifecycle.ts'),
            'utf8',
        );
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/globalSearch/globalSearchShellOpenFlow.ts'),
            'utf8',
        );
        expect(hostLifecycle).toContain('بلا تركيب Host حتى الفتح');
        expect(hostLifecycle).toContain('Host يُركَّب عند الفتح — ليس فور الهوية');
        expect(hostLifecycle).not.toContain('ركّب Host مخفياً فور وجود هوية');
        expect(hostLifecycle).not.toContain('setSearchHostMounted(true)');
        const beforePrime = hostLifecycle.slice(
            0,
            hostLifecycle.indexOf('export function primeGlobalSearchHostMount'),
        );
        expect(beforePrime).not.toContain('warmGlobalSearchOnHover()');
        expect(beforePrime).not.toContain('prefetchGlobalSearchOverlayChunk');
        expect(hostLifecycle).toContain('warmGlobalSearchOnHover()');
        expect(hostLifecycle).toContain('bindGlobalSearchBootHydrator');
        const overlayChunks = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(overlayChunks).not.toContain('prefetchGlobalSearchOverlayChunk');
        expect(openFlow).toContain('takeGlobalSearchDraftQuery');
        expect(hook).toContain('clearGlobalSearchDraftQuery');
        const bridgeHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchBridgeShellContent.ts',
            ),
            'utf8',
        );
        expect(bridgeHook).toContain('writeGlobalSearchDraftQuery');
        const queryHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchQuery.ts',
            ),
            'utf8',
        );
        expect(queryHook).toContain('takeGlobalSearchDraftQuery');
        expect(queryHook).toContain('peekGlobalSearchDraftQuery');
        expect(openFlow).toContain('paintGlobalSearchInstantChrome');
        expect(openFlow).not.toMatch(/from ['"]react-dom['"]/);
        expect(openFlow).not.toMatch(/\bflushSync\s*\(/);
        expect(hook).toContain('executeGlobalSearchOverlayClose');
        expect(hook).toContain('beginGlobalSearchShellExit');
        expect(hook).toContain('concealGlobalSearchWarmShell');
        expect(hook).toContain('snapGlobalSearchShellClose');
        const closeBody = hook.slice(
            hook.indexOf('const closeGlobalSearch = useCallback'),
            hook.indexOf('}, []);', hook.indexOf('const closeGlobalSearch = useCallback')) + 8,
        );
        expect(closeBody).toContain('setSearchHostMounted(false)');
        const overlay = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/index.tsx'),
            'utf8',
        );
        const shell = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayShell.ts',
            ),
            'utf8',
        );
        expect(overlay).toContain('GlobalSearchOverlayStaticShell');
        expect(overlay).not.toContain('LazyGlobalSearchMotionShell');
        expect(overlay).toMatch(/StaticShell دائماً/);
        expect(overlay).toContain('headless');
        expect(shell).toContain('keepWarm');
        expect(shell).not.toContain('warmIndex');
        expect(shell).toContain('onShellContent');
        const entrySrc = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardGlobalSearchOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entrySrc).toContain('userId={forumUserId}');
        expect(entrySrc).toContain('GlobalSearchInstantSheetChrome');
        const host = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost.tsx',
            ),
            'utf8',
        );
        expect(host).toContain('useBodyScrollLock');
        const focusArm = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchFocusArm.ts',
            ),
            'utf8',
        );
        expect(focusArm).toContain('isCapacitorNativePlatform');
        const searchHeader = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/components/SearchHeader.tsx',
            ),
            'utf8',
        );
        expect(searchHeader).not.toContain('readOnly={open && !focusArmed}');
        expect(searchHeader).toContain('homeStemIcons');
        expect(searchHeader).not.toContain('lucideIcons');
        expect(searchHeader).not.toContain('lucide-react');
        const searchIdle = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/components/SearchIdlePanel.tsx',
            ),
            'utf8',
        );
        expect(searchIdle).not.toContain('lucideIcons');
        expect(searchIdle).not.toContain('lucide-react');
        const recents = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/components/RecentSearchesPanel.tsx',
            ),
            'utf8',
        );
        expect(recents).toContain('homeStemIcons');
        expect(recents).not.toContain('lucideIcons');
        expect(recents).not.toContain('lucide-react');
        const instant = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantPaintCover.tsx',
            ),
            'utf8',
        );
        const hostChrome = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost.tsx',
            ),
            'utf8',
        );
        for (const chrome of [instant, hostChrome]) {
            expect(chrome).not.toContain('lucideIcons');
            expect(chrome).not.toContain('lucide-react');
        }
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/globalSearchNavDispatch.ts'),
            'utf8',
        );
        expect(nav).not.toMatch(
            /dispatchGlobalSearchNavigate[\s\S]*?if \(!isRealSignedIn\(ctx\.userId\)\)/,
        );
        expect(closeBody).not.toMatch(/releaseBodyScrollLock\s*\(/);
    });

    it('prefetch يغطي Entry اللوحة + Overlay — لا waterfall على أول ضغط', () => {
        const loader = fs.readFileSync(
            path.join(root, 'src/app/runtime/globalSearchLoader.ts'),
            'utf8',
        );
        expect(loader).toContain('prefetchGlobalSearchDashboardEntryChunk');
        expect(loader).toContain('LawyerDashboardGlobalSearchOverlayEntry');
        expect(loader).toMatch(
            /prefetchGlobalSearchOverlayChunk[\s\S]*?prefetchGlobalSearchDashboardEntryChunk/,
        );
        expect(loader).toContain('loadGlobalSearchOverlayHost');
        expect(loader).toMatch(
            /prefetchGlobalSearchOverlayChunk[\s\S]*?ensureOverlayHostPromise/,
        );
        const boot = fs.readFileSync(
            path.join(root, 'src/app/runtime/globalSearchBootHydrator.ts'),
            'utf8',
        );
        expect(boot).toContain('prefetchGlobalSearchInstantPaintCover');
        expect(boot).not.toContain('prefetchGlobalSearchOverlayChunk');
        const intent = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/globalSearchIntentWarm.ts'),
            'utf8',
        );
        expect(intent).toContain('prefetchGlobalSearchOverlayChunk');
    });

    it('G2: مسح جلسة البحث عند غياب هوية حقيقية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch.ts'),
            'utf8',
        );
        expect(hook).toContain('hasLocalAppSession(userId)');
        expect(hook).toContain('persistGlobalSearchSessionOpen(false)');
    });

    it('G7: إغلاق موحّد من bag + Cap back على Escape stack', () => {
        const surfaces = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(surfaces).toContain('closeGlobalSearch: globalSearch.closeGlobalSearch');
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost.tsx'),
            'utf8',
        );
        expect(host).toContain('useGlobalSearchOverlayDismiss');
        const dismiss = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayDismiss.ts',
            ),
            'utf8',
        );
        expect(dismiss).toContain('registerNativeBackHandler');
    });

    it('G8: Host يستورد الواجهة sync مثل الإشعارات — بلا جسر chunk', () => {
        const host = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost.tsx',
            ),
            'utf8',
        );
        expect(host).toContain("from '@/app/components/lawyer/GlobalSearchOverlay/index'");
        expect(host).toContain('<GlobalSearchOverlay');
        expect(host).not.toContain('global-search-load-error');
        expect(host).not.toContain('loadGlobalSearchOverlayModule');
        expect(host).not.toContain('getCachedGlobalSearchOverlay');
    });

    it('G9: البحث حاوية مستقلة — تجميد underlay + إخفاء الهيدر + ستارة html باردة في app-screen', () => {
        const css = readGlobalSearchOverlayCss();
        const appScreen = fs.readFileSync(path.join(root, 'src/styles/app-screen.css'), 'utf8');
        const layout = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlayLayout.ts'),
            'utf8',
        );
        expect(appScreen).toContain("html[data-hami-global-search-open='1']:not(:has(");
        expect(appScreen).toContain('background: #0a0f1c');
        expect(css).not.toMatch(/::before\s*\{/);
        expect(css).toContain('[data-search-open=\'true\']');
        expect(css).toContain("html[data-hami-global-search-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-native='1'][data-hami-global-search-open='1'] [data-hami-lawyer-dashboard]");
        expect(css).toContain("html[data-hami-global-search-open='1'] .hami-lawyer-header");
        expect(css).toContain('لا content-visibility:hidden');
        expect(css).not.toMatch(
            /html\[data-hami-global-search-open='1'\] \[data-hami-lawyer-dashboard\]\s*\{[^}]*content-visibility:\s*hidden/s,
        );
        expect(css).toContain("html[data-hami-overlay-unfreeze='1'][data-hami-global-search-open='1']");
        expect(css).toContain('content-visibility: visible !important');
        expect(css).toContain('translateZ(0)');
        expect(css).toContain(":not([data-hami-platform='ios'])");
        expect(css).toContain("html:not([data-hami-global-search-open='1']):not([data-hami-global-search-closing='1']) .hami-gs-layer");
        expect(css).toContain('data-hami-global-search-closing');
        expect(css).toContain('data-hami-gs-dismiss-locked');
        expect(css).toContain('data-hami-gs-enter');
        const gsPaint = fs.readFileSync(
            path.join(root, 'src/app/runtime/globalSearchInstantPaint.ts'),
            'utf8',
        );
        expect(gsPaint).toContain('armOverlayEnterSettle');
        expect(gsPaint).toContain('data-hami-gs-enter');
        expect(gsPaint).toContain('buildGlobalSearchInstantSheetInnerHtml');
        expect(gsPaint).toContain('GLOBAL_SEARCH_CHROME_HANDOFF_MAX_TICKS');
        expect(gsPaint).toContain('hostSheetCanTakeOver');
        expect(gsPaint).not.toMatch(/ticks > 36/);
        expect(css).not.toContain("[data-testid='home-main-grid']");
        expect(css).not.toContain("[data-testid='home-main-zone']");
        expect(css).toContain("data-hami-native='1'");
        expect(css).toContain('backdrop-filter: none !important');
        expect(css).not.toContain('hami-gs-sheet-in');
        expect(layout).toContain('resolveGlobalSearchSheetKeyboardStyle');
        expect(layout).not.toMatch(/return \{ bottom: kb \}/);
        const frame = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayLayerFrame.tsx',
            ),
            'utf8',
        );
        const cover = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantPaintCover.tsx',
            ),
            'utf8',
        );
        const staticShell = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayStaticShell.tsx',
            ),
            'utf8',
        );
        const main = readLawyerDashboardMainViewSurface();
        expect(frame).toContain('resolveGlobalSearchSheetKeyboardStyle');
        expect(cover).toContain('GlobalSearchOverlayLayerFrame');
        expect(staticShell).toContain('GlobalSearchOverlayLayerFrame');
        expect(main).toContain('globalSearchOpen');
    });

    it('خطافات E2E للبحث تعمل في VITE_E2E وليس DEV فقط', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch.ts'),
            'utf8',
        );
        expect(hook).toContain('isViteE2eHooksEnabled');
        expect(hook).not.toMatch(/if \(!import\.meta\.env\.DEV && typeof window/);
    });

    it('كاش extras موحّد: التحميل يكتب في extrasCache والمسبار يقرأه', () => {
        const load = fs.readFileSync(path.join(root, 'src/app/services/globalSearchLoad.ts'), 'utf8');
        const cache = fs.readFileSync(
            path.join(root, 'src/app/services/globalSearchExtrasCache.ts'),
            'utf8',
        );
        const probe = fs.readFileSync(
            path.join(root, 'src/app/services/search/globalSearchLocalWarmProbe.ts'),
            'utf8',
        );
        expect(load).toContain('setCachedGlobalSearchExtras');
        expect(load).toContain("from '@/app/services/globalSearchExtrasCache'");
        expect(load).not.toContain('let resolvedExtrasCache');
        expect(load).not.toContain('threadingFinance');
        expect(cache).not.toContain('FinanceRecord');
        expect(cache).not.toContain('threadingFinance');
        expect(probe).toContain("from '@/app/services/globalSearchExtrasCache'");
    });

    it('لا تصنيف finance في الفهرس أو شرائح البحث بعد مسح مالية المعاملات', () => {
        const index = fs.readFileSync(path.join(root, 'src/app/services/globalSearchIndex.ts'), 'utf8');
        const scopes = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/searchScopes.ts'),
            'utf8',
        );
        const constants = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/constants.ts'),
            'utf8',
        );
        expect(index).not.toContain("| 'finance'");
        expect(index).not.toContain("finance: 'سجلات مالية'");
        expect(scopes).not.toContain("'finance'");
        expect(constants).not.toContain("'finance'");
        expect(constants).not.toContain("from '@/app/components/ui/icons/Wallet'");
    });

    it('فشل التنقّل يُظهر تعذّر الفتح ثم يغلق — بلا صمت', () => {
        const nav = fs.readFileSync(path.join(root, 'src/app/hooks/globalSearchNavDispatch.ts'), 'utf8');
        expect(nav).toContain('SmartToast.error');
        expect(nav).toContain('GLOBAL_SEARCH_NAV_UNAVAILABLE');
        expect(nav).toContain('failSearchNavigate');
    });

    it('نتيجة التقويم المرتبطة بملف تفتح التقويم لا الإضبارة', () => {
        const extras = fs.readFileSync(
            path.join(root, 'src/app/services/search/globalSearchIndexExtrasEntries.ts'),
            'utf8',
        );
        expect(extras).not.toContain("{ type: 'file', fileId: e.caseId }");
        expect(extras).toContain("{ type: 'calendar', eventId: e.id, date: e.date }");
    });

    it('ملفات المعاملات ومركز المعاملات قسم عرض واحد بتسمية موحّدة', () => {
        const index = fs.readFileSync(path.join(root, 'src/app/services/globalSearchIndex.ts'), 'utf8');
        const sections = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/utils/searchResultSections.ts',
            ),
            'utf8',
        );
        const results = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/components/ResultsBody.tsx'),
            'utf8',
        );
        expect(index).toContain("transaction: 'معاملات'");
        expect(index).toContain("threading: 'معاملات'");
        expect(index).not.toContain('معاملات الملفات');
        expect(index).not.toContain('نظام المعاملات');
        expect(sections).toContain("['transaction', 'threading']");
        expect(sections).toContain("if (cat === 'threading') continue");
        expect(results).toContain('iterSearchResultSections');
    });

    it('صف النتيجة هدف لمس 44px', () => {
        const row = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/components/ResultRow.tsx'),
            'utf8',
        );
        expect(row).toContain('min-h-[44px]');
        expect(row).toContain('touch-manipulation');
    });

    it('هاتف: مقبض سحب 44px، طي IME، مستمع لوحة واحد بعد المنطق، بلا scroll visualViewport على الأصلي', () => {
        const host = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost.tsx',
            ),
            'utf8',
        );
        const sheet = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlaySheetBody.tsx',
            ),
            'utf8',
        );
        const handle = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/components/GlobalSearchSheetHandle.tsx',
            ),
            'utf8',
        );
        const header = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/components/SearchHeader.tsx',
            ),
            'utf8',
        );
        const dismiss = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/hooks/useGlobalSearchOverlayDismiss.ts',
            ),
            'utf8',
        );
        const inset = fs.readFileSync(path.join(root, 'src/app/hooks/useMobileKeyboardInset.ts'), 'utf8');
        const chrome = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/overlayCss/gsChrome.css',
            ),
            'utf8',
        );
        const sheetCss = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/overlayCss/gsSheet.css',
            ),
            'utf8',
        );
        expect(host).toContain('open && !logicContent');
        expect(host).toContain('blurActiveGlobalSearchField');
        expect(sheet).toContain('GlobalSearchSheetHandle');
        expect(handle).toContain('useSheetSwipeDismiss');
        expect(handle).toContain('follow: !reduceMotion');
        expect(handle).toContain('{...swipe}');
        expect(handle).toContain('--gs-swipe-y');
        expect(handle).toContain('global-search-swipe-handle');
        const swipeHook = fs.readFileSync(
            path.join(root, 'src/app/hooks/useSheetSwipeDismiss.ts'),
            'utf8',
        );
        expect(swipeHook).toContain('onPointerDown');
        expect(swipeHook).toContain('setPointerCapture');
        expect(header).toContain('EMPTY_SEARCH_INPUT_REF');
        expect(dismiss).toContain('blurActiveGlobalSearchField');
        expect(inset).toContain("if (!isHamiNativeShell())");
        expect(inset).toContain("vv.addEventListener('scroll'");
        expect(chrome).toContain("html[data-hami-native='1'] .hami-gs-result-card");
        expect(sheetCss).toContain('.hami-gs-handle-hit');
        expect(sheetCss).toContain('min-height: 44px');
        expect(sheetCss).toContain('touch-action: none');
        expect(sheetCss).toContain('--gs-swipe-y');
        expect(sheetCss).toContain("[data-gs-swiping='1']");
        expect(sheetCss).toContain("[data-gs-paint='true']");
        expect(sheetCss).toContain('min-height: 13.5rem');
    });

    it('أمان: تنقّل مُنقّى، بلا ترحيل الأخيرة المشتركة، جلسة محلية قبل الفتح', () => {
        const nav = fs.readFileSync(path.join(root, 'src/app/hooks/globalSearchNavDispatch.ts'), 'utf8');
        const recents = fs.readFileSync(
            path.join(root, 'src/app/services/search/readGlobalSearchRecentSearchesSync.ts'),
            'utf8',
        );
        const querySec = fs.readFileSync(
            path.join(root, 'src/app/services/search/globalSearchQuerySecurity.ts'),
            'utf8',
        );
        const display = fs.readFileSync(
            path.join(root, 'src/app/services/search/searchDisplayText.ts'),
            'utf8',
        );
        expect(nav).toContain('sanitizeGlobalSearchNavigate');
        expect(nav).toContain('hasLocalAppSession');
        expect(nav).toContain('isOwnedCriminalCaseId');
        expect(recents).toContain('يُحذف ولا يُهاجَر');
        expect(recents).not.toContain('JSON.stringify(migrated)');
        expect(querySec).toContain('stripSearchUnsafeChars');
        expect(display).toContain("replace(/<[^>]*>/g, '')");
    });
});

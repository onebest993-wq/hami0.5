import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('global search section surgical close honesty', () => {
    it('تنقّل الملف/القضية يمرّر userId الحقيقي لا isRealSignedIn(null)', () => {
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/globalSearchNavDispatch.ts'),
            'utf8',
        );
        expect(nav).toContain('userId: string | null');
        expect(nav).toContain('isRealSignedIn(ctx.userId)');
        expect(nav).not.toContain('isRealSignedIn(null)');
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardGlobalSearchNav.ts'),
            'utf8',
        );
        expect(hook).toContain('dispatchGlobalSearchNavigate');
        expect(hook).toContain('userId: userIdRef.current');
    });

    it('DeferredFeatureSurfaces يمرّر userId إلى globalSearchNav', () => {
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
    });

    it('MainView يركّب Entry عند show أو searchHostMounted (keepAlive مثل الإعدادات)', () => {
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toMatch(/globalSearchLive\s*=/);
        expect(main).toContain('searchHostMounted');
        expect(main).toContain('showGlobalSearch');
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
    });

    it('searchHostMounted يبدأ مغلقاً إلا عند استعادة جلسة مفتوحة', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch.ts'),
            'utf8',
        );
        expect(hook).toContain('useState(() => initialSession.open)');
        expect(hook).not.toMatch(/searchHostMounted,\s*setSearchHostMounted\]\s*=\s*useState\(true\)/);
    });

    it('تصنيف البحث مربوط من Inner عبر filterGroupedResultsByScope', () => {
        const overlay = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/index.tsx'),
            'utf8',
        );
        expect(overlay).toContain('filterGroupedResultsByScope');
        expect(overlay).toContain('onSearchScopeChange: setSearchScope');
        expect(overlay).toContain('searchScope');
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

    it('مسار الهيدر يفتح عند pointerdown مع Entry sync (بلا Suspense fallback)', () => {
        const trigger = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerDashboardParts/components/HeaderSearchTrigger.tsx',
            ),
            'utf8',
        );
        expect(trigger).toContain('header-search-trigger');
        expect(trigger).toContain('activateOnPointerDown');
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('LawyerDashboardGlobalSearchOverlayEntry');
        expect(main).toContain('showGlobalSearch');
        expect(main).toMatch(
            /globalSearchLive\s*\?[\s\S]*?LawyerDashboardGlobalSearchOverlayEntry/,
        );
    });

    it('لا رسالة «جاري فتح البحث» — Host=StaticShell ثابت وبدون نص انتظار', () => {
        const bridge = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayLoadingBridge.tsx',
            ),
            'utf8',
        );
        expect(bridge).toContain('GlobalSearchOverlayStaticShell');
        expect(bridge).toContain('useGlobalSearchBridgeShellContent');
        expect(bridge).not.toMatch(/جاري فتح البحث/);
        const fallback = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerDashboardParts/LazyFallback.tsx'),
            'utf8',
        );
        expect(fallback).toContain('GlobalSearchInstantShell');
        expect(fallback).not.toContain('جاري فتح البحث');
        expect(fallback).not.toContain('readOnly');
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
        expect(staticShell).toContain('useOverlayCloseArm');
        expect(staticShell).toContain('requestClose');
        expect(staticShell).toContain('focusArmed');
    });

    it('تركيب Host فور هوية حقيقية + تسليم مسودة عبر bridge hook', () => {
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
        expect(hostLifecycle).toContain('ركّب Host مخفياً فور وجود هوية');
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
        expect(openFlow).toContain('snapGlobalSearchShellOpen');
        expect(openFlow).toContain('revealGlobalSearchWarmShell');
        expect(openFlow).toMatch(/snapGlobalSearchShellOpen\(\)[\s\S]*flushSync/);
        expect(hook).toContain('executeOverlaySnapClose');
        expect(hook).toContain('concealGlobalSearchWarmShell');
        expect(hook).toContain('snapGlobalSearchShellClose');
        const closeBody = hook.slice(
            hook.indexOf('const closeGlobalSearch = useCallback'),
            hook.indexOf('}, []);', hook.indexOf('const closeGlobalSearch = useCallback')) + 8,
        );
        expect(closeBody).not.toContain('setSearchHostMounted(false)');
        const overlay = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/index.tsx'),
            'utf8',
        );
        expect(overlay).toContain('keepWarm');
        expect(overlay).toContain('warmIndex={open}');
        expect(overlay).not.toContain('warmIndex={open || keepWarm}');
        expect(overlay).toContain('GlobalSearchOverlayStaticShell');
        expect(overlay).not.toContain('LazyGlobalSearchMotionShell');
        expect(overlay).toMatch(/StaticShell دائماً/);
        expect(overlay).toContain('headless');
        expect(overlay).toContain('onShellContent');
        const entrySrc = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardGlobalSearchOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entrySrc).toContain('userId={forumUserId}');
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
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/globalSearchNavDispatch.ts'),
            'utf8',
        );
        expect(nav).toMatch(
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
    });

    it('G2: مسح جلسة البحث عند غياب هوية حقيقية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardGlobalSearch.ts'),
            'utf8',
        );
        expect(hook).toContain('isRealSignedIn(userId)');
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
        const keyboard = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/hooks/useSearchKeyboard.ts',
            ),
            'utf8',
        );
        expect(keyboard).toContain('registerNativeBackHandler');
    });

    it('G8: Host يعرض استعادة عند فشل chunk', () => {
        const host = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost.tsx',
            ),
            'utf8',
        );
        expect(host).toContain('global-search-load-error');
        expect(host).toContain('global-search-load-retry');
    });

    it('G9: CSS يُبقي الرئيسية مرسومة تحت البحث + ستارة html فورية', () => {
        const css = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/GlobalSearchOverlay/globalSearchOverlay.css'),
            'utf8',
        );
        expect(css).toContain("html[data-hami-global-search-open='1']::before");
        expect(css).toContain('[data-search-open=\'true\']');
        expect(css).toContain('[data-testid=\'home-main-zone\']');
        expect(css).toContain('[data-testid=\'home-main-grid\']');
        expect(css).toContain('visibility: visible !important');
        expect(css).not.toContain("html[data-hami-global-search-open='1'] .hami-dashboard-home-stack-cover {\n    visibility: hidden");
    });
});

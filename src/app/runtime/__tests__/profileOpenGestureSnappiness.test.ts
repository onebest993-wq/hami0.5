import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

const root = process.cwd();

describe('profile open gesture snappiness', () => {
    it('يفتح الملف قبل إغلاق overlays المتنافسة', () => {
        const orch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        const block = orch.slice(
            orch.indexOf('const openProfileTab = useCallback'),
            orch.indexOf('const closeHubShellOverlays'),
        );
        expect(block.indexOf('openProfileTabInnerRef.current()')).toBeLessThan(
            block.indexOf('closeOverlaysBeforeProfileOpen'),
        );
        expect(block).toContain('queueMicrotask');
    });

    it('يكشف الملف عبر DOM ثم مزامنة React فورية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardProfileTab.ts'),
            'utf8',
        );
        expect(hook).toContain('concealProfileWarmShell');
        expect(hook).toContain('commitProfileOpen');
        expect(hook).toContain('wasProfileOpenedThisPage');
        expect(hook).not.toContain('revealProfileWarmShell');

        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/profile/profileShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('revealProfileWarmShell');
        expect(openFlow).toMatch(/from ['"]react-dom['"]/);
        expect(openFlow).toMatch(/\bflushSync\s*\(/);
        expect(openFlow).toContain('royalLawyerProfileLoader');
        expect(openFlow).toContain('loadProfileHubModule');
        expect(openFlow).toContain('prepareProfileOpenPaint');
        expect(openFlow).toContain('hydrateProfileWarmCachePeekSync');
        const commitBlock = openFlow.slice(openFlow.indexOf('export function commitProfileOpen'));
        expect(commitBlock).not.toContain('waitForProfileHubOpen');
        expect(commitBlock).toContain('revealProfileWarmShell()');
        expect(commitBlock).not.toContain('revealLive');
        expect(commitBlock).not.toContain('scheduleProfileShellReactSync');
        const hydrateIdx = commitBlock.indexOf('prepareProfileOpenPaint');
        const flushIdx = commitBlock.indexOf('flushSync');
        const revealIdx = commitBlock.indexOf('revealProfileWarmShell()');
        expect(hydrateIdx).toBeGreaterThanOrEqual(0);
        expect(flushIdx).toBeGreaterThan(hydrateIdx);
        expect(revealIdx).toBeGreaterThan(flushIdx);

        const closeBlock = hook.slice(
            hook.indexOf('const closeProfileTab = useCallback'),
            hook.indexOf('/** ركّب Host مخفياً'),
        );
        expect(closeBlock).toContain('commitProfileClose');
        expect(hook).not.toContain('useProfileShellReadiness');
        expect(hook).not.toContain('profileShellReady');
        expect(hook).not.toContain('resetProfileTabShell');

        const closeFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/profile/profileShellCloseFlow.ts'),
            'utf8',
        );
        expect(closeFlow).toContain('concealProfileWarmShell');
        expect(closeFlow).toContain('beginProfileShellExit');
        expect(closeFlow).toContain('executeProfileOverlayClose');
        expect(closeFlow).toContain('flushSync');
        expect(closeFlow).toContain('clearProfileShellClosing');
        expect(closeFlow).not.toContain('clearHomeForceVisible');
        expect(closeFlow).not.toContain('forceShowLawyerHomeShell');
        /* إغلاق فوري — لا double-rAF يترك --active يغطي الرئيسية */
        expect(closeFlow).not.toContain('scheduleProfileShellReactSync');
        const closeCommit = closeFlow.slice(closeFlow.indexOf('export function commitProfileClose'));
        expect(closeCommit.indexOf('concealProfileWarmShell()')).toBeLessThan(
            closeCommit.indexOf('flushSync'),
        );
        expect(closeCommit.indexOf("setActiveTab('home')")).toBeLessThan(
            closeCommit.indexOf('clearProfileShellClosing'),
        );

        const instantPaint = fs.readFileSync(
            path.join(root, 'src/app/runtime/profileInstantPaint.ts'),
            'utf8',
        );
        expect(instantPaint).toContain('releaseProfileFeatureChrome');
        expect(instantPaint).not.toContain('data-hami-home-force-visible');
        expect(instantPaint).not.toContain('forceShowLawyerHomeShell');

        const snap = fs.readFileSync(
            path.join(root, 'src/app/services/profile/profileShellSnap.ts'),
            'utf8',
        );
        expect(snap).toContain('data-hami-profile-closing');
        expect(snap).toContain('clearProfileShellClosing');
        expect(snap).not.toContain('PROFILE_SHELL_SNAP_EVENT');
        expect(snap).not.toContain('emitProfileShellSnap');

        const enterCss = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/RoyalLawyerProfile/profilePageEnterFx.css'),
            'utf8',
        );
        expect(enterCss).toContain("data-hami-profile-closing='1'");
        expect(enterCss).toContain('data-hami-profile-back-locked');
        expect(enterCss).not.toContain('opacity: 0.62');
        expect(enterCss).not.toContain('data-hami-profile-enter');
        expect(enterCss).toContain('.hami-dashboard-home-stack-cover');
        expect(enterCss).toMatch(
            /html\[data-hami-profile-closing='1'\][\s\S]*\.hami-dashboard-home-stack-cover/,
        );
        /* سطح الملف fixed دائماً (حتى مخفياً) — يغطي لون اللوحة بلا قفزة absolute→fixed */
        expect(enterCss).toMatch(
            /html\[data-hami-profile-open='1'\][^{]*lawyer-dashboard-profile-surface[^{]*\{[^}]*z-index:\s*200/s,
        );

        const chromeCss = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/RoyalLawyerProfile/profileChrome.css'),
            'utf8',
        );
        expect(chromeCss).toContain("lawyer-dashboard-profile-surface']");
        expect(chromeCss).toContain('position: fixed !important');

        expect(instantPaint).toContain('beginProfileBackLock');
        expect(instantPaint).not.toContain('armOverlayEnterSettle');
        expect(instantPaint).toContain('paintProfileInstantChrome');
        expect(instantPaint).toContain('isProfileLiveContentReady');
        expect(instantPaint).toContain('isProfilePageComplete');
        expect(instantPaint).toContain('scheduleLiveSnap');
        expect(instantPaint).not.toContain('isProfileSurfaceCovered');
        expect(instantPaint).not.toContain('profile-open-instant-chrome');
        expect(instantPaint).not.toContain('fillProfileInstantBridgeIdentity');
        expect(instantPaint).not.toContain('ensureProfileInstantBridge');
        expect(instantPaint).toContain("removeAttribute('inert')");
        expect(instantPaint).not.toContain('resetProfileSurfaceScroll');
        expect(instantPaint).not.toContain('offsetHeight');
        /* جسر عند غياب السطح — لا مسار يترك لون اللوحة مكشوفاً */
        expect(instantPaint).not.toContain(
            'removeProfileInstantBridge();\n        scheduleBridgeHandoff',
        );

        const pageHiddenHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/hooks/useProfilePageHidden.ts',
            ),
            'utf8',
        );
        expect(pageHiddenHook).toContain('document.hidden');
        expect(pageHiddenHook).not.toContain('!screenActive');

        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardShell.tsx'),
            'utf8',
        );
        expect(shell).toContain('topInset={false}');

        const safeView = fs.readFileSync(
            path.join(root, 'src/app/components/shared/SafeView.tsx'),
            'utf8',
        );
        expect(safeView).toContain('topInset');
        expect(safeView).toContain("topInset ? 'pt-[env(safe-area-inset-top)]' : 'pt-0'");

        const headerVis = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardHeaderVisibility.ts'),
            'utf8',
        );
        expect(headerVis).toContain('isLawyerDashboardHomeStackTab');
        expect(headerVis).toContain("tab === 'profile'");
        expect(headerVis).toContain("tab === 'notifications'");

        const bundle = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        expect(bundle).toContain('isLawyerDashboardHomeStackTab(params.activeTab)');

        const main = readLawyerDashboardMainViewSurface();
        expect(main).toContain('homeTabProps.visible || !schedulePaintOpen');
        expect(main).toContain('visible={homeActive}');
        expect(main).toContain('data-hami-dashboard-tab-stack');
        expect(main).toContain('LazyProfileTabHost');
        expect(main).toContain('ProfilePagePaintGate');
        expect(main).not.toContain('<ProfilePaintGate');
        expect(main).not.toContain('PROFILE_SHELL_SNAP_EVENT');
        expect(main).not.toContain('ProfileOpenInstantChrome');

        const trigger = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarter.tsx',
            ),
            'utf8',
        );
        expect(trigger).not.toContain('snapProfileShellOpen');
        expect(trigger).toContain("from '@/app/runtime/profileInstantPaint'");
        expect(trigger).toContain('beginProfileBackLock');
        expect(trigger).not.toContain('revealProfileWarmShell');
        expect(trigger).toContain('continueOpen');
        expect(trigger).not.toContain('continueOpenAfterPaint');
        expect(trigger).not.toContain('requestAnimationFrame');
        expect(trigger).not.toContain("import('@/app/runtime/profileInstantPaint')");

        const forum = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/commandHub/ForumTile.tsx',
            ),
            'utf8',
        );
        expect(forum).toContain('ForumTileProfileQuarterSlot');
        expect(forum).not.toContain('snapProfileShellOpen');
        const forumSlot = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterSlot.tsx',
            ),
            'utf8',
        );
        expect(forumSlot).toContain('LazyForumTileProfileQuarter');

        const back = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileChromeHeader.tsx',
            ),
            'utf8',
        );
        expect(back).toContain('data-testid="lawyer-profile-back"');
        expect(back).not.toContain('concealProfileWarmShell');
    });

    it('ضغط الهيدر لا يستدعي warmProfileOnOpen قبل الفتح', () => {
        const prefetch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardHeaderPrefetch.ts'),
            'utf8',
        );
        const press = prefetch.slice(
            prefetch.indexOf('const prefetchProfilePress'),
            prefetch.indexOf('const prefetchSearchHover'),
        );
        expect(press).not.toMatch(/warmProfileOnOpen\s*\(/);
        expect(press).not.toMatch(/loadRoyalLawyerProfileModule\s*\(/);
        expect(press).not.toMatch(/loadProfileTabModule\s*\(/);
        expect(press).toContain('loadProfileHub');
        expect(press).toContain('loadProfileHubModule');
        expect(press).toContain('primeProfileTabMount');
        expect(press).not.toContain('lawyerDashboardHeaderPrefetch =');
    });

    it('زر الرجوع أصلي بلا motion.button', () => {
        const chrome = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/RoyalLawyerProfile/components/ProfileChromeHeader.tsx',
            ),
            'utf8',
        );
        expect(chrome).not.toContain("from 'motion/react'");
        expect(chrome).not.toContain('motion.button');
        expect(chrome).toContain('data-testid="lawyer-profile-back"');
        expect(chrome).toContain('min-h-[44px]');
        expect(chrome).toContain('onBack()');
        expect(chrome).not.toContain('concealProfileWarmShell');
    });
});

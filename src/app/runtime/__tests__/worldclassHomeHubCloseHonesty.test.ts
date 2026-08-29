import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readHomeTabImplSource } from './readHomeTabImplSource';

const root = process.cwd();

describe('world-class home-hub close honesty', () => {
    it('H9: marks open-request متزامنة عند دخول الرئيسية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab.ts'),
            'utf8',
        );
        expect(hook).toMatch(/markHomeHubPerfPhase\('open-request'\)/);
        expect(hook).not.toMatch(/clearHomeHubPerfMarks\(\)/);
    });

    it('H1: interactive احتياطي + reportedRef في useHomeHubLifecycle', () => {
        const life = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubLifecycle.ts',
            ),
            'utf8',
        );
        expect(life).toContain('reportedRef');
        expect(life).toMatch(/setTimeout\(markInteractiveFallback,\s*1_?200\)/);
        expect(life).toContain("markHomeHubPerfPhase('interactive')");
        expect(life).toContain("markHomeHubPerfPhase('first-paint')");
        expect(life).not.toContain('readHomeHubRadarCache');
    });

    it('H7/H10: Cap + Escape على أوراق المزيد الحية', () => {
        const sheet = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubOverlaySheet.ts',
            ),
            'utf8',
        );
        const stack = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubOverlayBackStack.ts',
            ),
            'utf8',
        );
        const fx = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard/homeHubOverlayFx.css'),
            'utf8',
        );
        expect(sheet).toContain('useBodyScrollLock');
        expect(sheet).toContain('useLayoutEffect');
        expect(sheet).toContain('pushHomeHubOverlayBack');
        expect(stack).toContain('registerNativeBackHandler');
        expect(stack).toContain("event.key !== 'Escape'");
        expect(fx).toContain('safe-area-inset-top');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/NeuralAlertsCard/AlertCardItem.tsx'),
            ),
        ).toBe(false);
    });

    it('H2: تنقّل اللوحة يستخدم جلسة تطبيق محلية', () => {
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(nav).toContain('hasLocalAppSession(userId)');
        expect(nav).not.toContain('hasLocalAppSession(null)');
        expect(nav).not.toContain('isRealSignedIn(null)');
    });

    it('H5: تبويبات hub ≥44px مع tablist', () => {
        const tabs = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/components/HubPanelTabs.tsx',
            ),
            'utf8',
        );
        const fx = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard/homeHubCardFx.css'),
            'utf8',
        );
        expect(tabs).toContain('role="tablist"');
        expect(tabs).toContain('home-hub-tab-${panel}');
        expect(tabs).toContain('bootSettling');
        expect(tabs).not.toContain('layoutId');
        expect(tabs).toContain('hami-hub-tab__badge--reserved');
        expect(tabs).not.toContain('showBadge || bootSettling');
        expect(tabs).not.toContain('homeHubCardFx.css');
        expect(fx).toMatch(/min-height:\s*44px/);
        const critical = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );
        expect(critical).toContain('.hami-hub-tab__pill');
        expect(fx).not.toContain('.hami-hub-tab__pill');
    });

    it('H11: استقرار إقلاع Hub — شارات ثم تبويب + pill بلا layoutId مبكر', () => {
        const panelState = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubPanelState.ts',
            ),
            'utf8',
        );
        const hubHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/hooks/useLawyerHomeHubCard.ts',
            ),
            'utf8',
        );
        const critical = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );
        expect(panelState).toContain('badgeCountsSettled');
        expect(hubHook).toContain('hubBootSettling');
        expect(hubHook).toContain('hubBadgeCountsSettled');
        expect(hubHook).toContain('bootRevealDone');
        expect(hubHook).not.toContain('isBootRevealDone()');
        expect(hubHook).toContain('useHomeHubCardStatus');
        const status = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubCardStatus.ts'),
            'utf8',
        );
        expect(status).toContain('resolveStableHubHasItems');
        const clsGate = fs.readFileSync(
            path.join(root, 'src/app/services/alerts/homeSurfaceStabilityGate.ts'),
            'utf8',
        );
        expect(clsGate).toContain('HOME_SURFACE_POST_REVEAL_CLS_MAX');
        expect(clsGate).toContain('evaluateHomeSurfaceStability');
        expect(critical).toContain('data-hub-boot-settling');
        expect(critical).toContain("section[data-testid='home-hub-card']");
        expect(critical).toContain("[data-hub-has-items='1']");
        expect(critical).not.toMatch(
            /\[data-testid='home-hub-card'\]\s+\.hami-hub-readable-panels\s*\{[^}]*min-height:\s*15rem/s,
        );
        const card = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard.tsx'),
            'utf8',
        );
        expect(card).toContain('data-hub-has-items');
        expect(card).not.toMatch(/sectionMinHeightClass\} min-h-0 gap-3/);
        const homeTab = readHomeTabImplSource(root);
        const hubSkeleton = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/HomeHubCardSkeleton.tsx'),
            'utf8',
        );
        expect(homeTab).toContain('HomeHubCardSkeleton');
        expect(hubSkeleton).toContain('home-hub-card-skeleton');
        expect(homeTab).not.toContain('animate-pulse');
        expect(homeTab).not.toContain('min-h-[280px]');
        const panelBody = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPanelBody.tsx',
            ),
            'utf8',
        );
        expect(panelBody).not.toContain('15rem');
        const fx = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard/homeHubCardFx.css'),
            'utf8',
        );
        expect(fx).not.toMatch(/\.hami-hub-alerts-loading\s*\{[^}]*min-height:\s*15rem/s);
    });

    it('H7: رادار مربوط بـ dismiss', () => {
        const radar = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubRadarState.ts',
            ),
            'utf8',
        );
        expect(radar).toContain('filterVisibleHomeHubRadarEvents');
        const guards = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubGuardedActions.ts',
            ),
            'utf8',
        );
        expect(guards).toContain('dismissHomeHubRadarId');
        expect(guards).toContain('guardedDismissRadar');
    });

    it('نظافة: بلا alertsStageReady ميت وبلا homeHubCardSessionKey ثابت', () => {
        const home = readHomeTabImplSource(root);
        expect(home).not.toContain('alertsStageReady');
        expect(home).not.toContain('homeHubCardSessionKey');
        const homeHook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab.ts'),
            'utf8',
        );
        expect(homeHook).not.toContain('homeHubCardSessionKey');
    });

    it('H8: Hub كسول عبر homeHubCardLoader؛ التسخين بعد إطار أول تبويب لا مع بايت النواة', () => {
        const home = readHomeTabImplSource(root);
        expect(home).toContain('HomeHubErrorBoundary');
        expect(home).toContain('LazyLawyerHomeHubCard');
        expect(home).toContain('loadLawyerHomeHubCardModule');
        expect(home).not.toMatch(
            /import \{ LawyerHomeHubCard \} from ['"]@\/app\/components\/lawyer\/LawyerHomeHubCard['"]/,
        );
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).not.toMatch(/import\('@\/app\/components\/lawyer\/LawyerHomeHubCard'\)/);
        expect(preload).toContain('prefetchLawyerHomeHubCardModule');
        expect(preload).toContain('requestAnimationFrame(warmHub)');
        const warm = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(warm).toContain('prefetchLawyerHomeHubCardModule');
    });
});

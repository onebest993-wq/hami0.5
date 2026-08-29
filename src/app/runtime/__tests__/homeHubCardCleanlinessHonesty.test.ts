import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const hub = join(root, 'src/app/components/lawyer/LawyerHomeHubCard');
const components = join(hub, 'components');

describe('home hub card cleanliness', () => {
    it('بطاقة واحدة حية: بلا إعادة تصدير ErrorBoundary وبلا AlertCardItem ميت', () => {
        expect(existsSync(join(hub, 'HomeHubErrorBoundary.tsx'))).toBe(false);
        expect(
            existsSync(join(root, 'src/app/components/lawyer/NeuralAlertsCard/AlertCardItem.tsx')),
        ).toBe(false);
        expect(existsSync(join(root, 'src/app/components/lawyer/LawyerHomeHubCard.tsx'))).toBe(true);
        const slot = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/HomeHubHomeSlot.tsx'),
            'utf8',
        );
        const homeTab = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(slot).toContain('LazyLawyerHomeHubCard');
        expect(slot).toContain('getCachedLawyerHomeHubCard');
        expect(slot).not.toContain('setHubCard');
        expect(existsSync(join(root, 'src/app/components/lawyer/dashboard/commandHub/AlertsHubTile.tsx'))).toBe(
            false,
        );
        expect(slot).not.toContain('AlertsHubTile');
        expect(slot).not.toContain('home-hub-entry-overlay');
        expect(slot).toContain('shouldReduceHomeHubScrollMotion');
        expect(slot).toContain("behavior: shouldReduceHomeHubScrollMotion() ? 'auto' : 'smooth'");
        expect((slot.match(/LazyLawyerHomeHubCard/g) ?? []).length).toBe(2);
        expect(homeTab).not.toContain('LawyerHomeHubCard');
        expect(homeTab).toContain('HomeMainGridFirstPaint');
        expect(homeTab).toContain('HomeTabContent');
    });

    it('قسم الرادار الميت حُذف؛ الحالة الفارغة ورقة dashboard واحدة بلا إعادة تصدير', () => {
        expect(existsSync(join(components, 'HomeHubRadarSection.tsx'))).toBe(false);
        expect(existsSync(join(components, '__tests__/HomeHubRadarSection.test.tsx'))).toBe(false);
        expect(existsSync(join(components, 'HomeHubEmptyState.tsx'))).toBe(false);
        const leaf = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/HomeHubEmptyState.tsx'),
            'utf8',
        );
        expect(leaf).toContain('hami-hub-empty');
        expect(leaf).toContain('min-h-[44px]');
        expect(leaf).toContain('role="status"');
        expect(leaf).not.toContain('<button');
        const skeleton = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/HomeHubCardSkeleton.tsx'),
            'utf8',
        );
        expect(skeleton).toContain("from './HomeHubEmptyState'");
        expect(skeleton).not.toContain('LawyerHomeHubCard');
        const alerts = readFileSync(join(components, 'HomeHubAlertsPanel.tsx'), 'utf8');
        expect(alerts).toContain("from '@/app/components/lawyer/dashboard/HomeHubEmptyState'");
        expect(alerts).not.toContain('HomeHubRadarSection');
        expect(alerts).not.toContain("from './HomeHubEmptyState'");
    });

    it('لا خصائص ميتة: تحويل/حل/مفتاح تخطيط/reduceMotion', () => {
        const card = readFileSync(join(root, 'src/app/components/lawyer/LawyerHomeHubCard.tsx'), 'utf8');
        const hook = readFileSync(join(hub, 'hooks/useLawyerHomeHubCard.ts'), 'utf8');
        const guards = readFileSync(join(hub, 'homeHub/homeHubGuardedActions.ts'), 'utf8');
        const alerts = readFileSync(join(components, 'HomeHubAlertsPanel.tsx'), 'utf8');
        const tabs = readFileSync(join(components, 'HubPanelTabs.tsx'), 'utf8');
        const slot = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/HomeHubHomeSlot.tsx'),
            'utf8',
        );
        expect(card).not.toContain('useReduceMotion');
        expect(tabs).not.toContain('reduceMotion');
        expect(hook).not.toContain('onAcceptedConvertToCase');
        expect(hook).not.toContain('alertsLayoutKey');
        expect(hook).toContain('containerBorderOn');
        expect(guards).not.toContain('onAcceptedConvertToCase');
        expect(guards).not.toContain('guardedResolved');
        expect(guards).toContain('guardedTogglePin');
        expect(alerts).not.toContain('alertsLayoutKey');
        expect(alerts).not.toContain('onAcceptedConvertToCase');
        expect(slot).not.toContain('onAcceptedConvertToCase={');
        expect(slot).not.toContain('onResolved={');
    });

    it('خطاف البطاقة مقسوم: أنواع + مصدر/حي/حالة + شارات + صدفة', () => {
        const hook = readFileSync(join(hub, 'hooks/useLawyerHomeHubCard.ts'), 'utf8');
        const types = readFileSync(join(hub, 'hooks/lawyerHomeHubCard.types.ts'), 'utf8');
        const source = readFileSync(join(hub, 'hooks/useHomeHubAlertsSource.ts'), 'utf8');
        const live = readFileSync(join(hub, 'hooks/useHomeHubAlertsLive.ts'), 'utf8');
        const status = readFileSync(join(hub, 'hooks/useHomeHubCardStatus.ts'), 'utf8');
        const badges = readFileSync(join(hub, 'hooks/useHomeHubBadgeSettling.ts'), 'utf8');
        const shell = readFileSync(join(hub, 'hooks/useHomeHubCardShellStyle.ts'), 'utf8');
        const card = readFileSync(join(root, 'src/app/components/lawyer/LawyerHomeHubCard.tsx'), 'utf8');
        const back = readFileSync(join(hub, 'homeHub/homeHubOverlayBackStack.ts'), 'utf8');
        expect(types).toContain('export type LawyerHomeHubCardProps');
        expect(types).toContain('export type LawyerHomeHubCardViewModel');
        expect(hook).toContain('useHomeHubAlertsSource');
        expect(hook).toContain('useHomeHubAlertsLive');
        expect(hook).toContain('useHomeHubCardStatus');
        expect(hook).toContain('useHomeHubBadgeSettling');
        expect(hook).toContain('useHomeHubCardShellStyle');
        expect(hook).toContain('useHomeHubWorkspacePins');
        const pinsHook = readFileSync(join(hub, 'hooks/useHomeHubWorkspacePins.ts'), 'utf8');
        expect(pinsHook).toContain("import('@/app/stores/workspaceStore')");
        expect(pinsHook).not.toMatch(/from ['"]@\/app\/stores\/workspaceStore['"]/);
        expect(hook).not.toMatch(/from ['"]@\/app\/stores\/workspaceStore['"]/);
        expect(hook).not.toMatch(/from ['"]@\/app\/components\/ui\/SmartToast['"]/);
        expect(hook).toContain("import('@/app/components/ui/SmartToast')");
        expect(hook).toContain('UseLawyerHomeHubCardParams');
        expect(hook).not.toContain('export type {');
        expect(hook).not.toMatch(/export function useLawyerHomeHubCard\([\s\S]*?layoutEditMode/s);
        expect(hook).not.toContain('secretaryTabCount');
        expect(hook).not.toContain('loadSparkRuntime');
        expect(source).toContain('useNeuralAlertsFromSecretary');
        expect(live).toContain('useHomeHubRadarStateGated');
        expect(live).toContain('resolveHomeHubLiveRadarEnabled');
        expect(live).toContain('CALENDAR_UPDATED_EVENT');
        expect(live).toContain('invalidateHomeHubRadarCache');
        expect(live).toContain('peekHomeHubRadarSnapshot');
        expect(status).toContain('resolveStableHubHasItems');
        expect(card).toContain('LawyerHomeHubCardProps');
        expect(card).toContain('aria-label="التنبيهات والتثبيت"');
        expect(badges).toContain('useHomeHubBootReveal');
        expect(badges).not.toContain('loadSparkRuntime');
        expect(shell).toContain('skipGlassPaint: true');
        expect(shell).not.toContain('baseMinHeightPx: 240');
        expect(existsSync(join(components, 'HomeHubRadarMoreOverlay.tsx'))).toBe(false);
        expect(back).not.toContain('home-hub-radar-more');
        expect(back).not.toContain('home-hub-secretary-more');
    });

    it('تبويب السكرتير حُذف؛ تبويبان فقط (تنبيهات + تثبيت)', () => {
        expect(existsSync(join(components, 'HomeHubSecretaryPanel.tsx'))).toBe(false);
        expect(existsSync(join(components, 'HomeHubSecretaryMoreOverlay.tsx'))).toBe(false);
        const tabs = readFileSync(join(components, 'HubPanelTabs.tsx'), 'utf8');
        const panelBody = readFileSync(join(components, 'HomeHubPanelBody.tsx'), 'utf8');
        expect(tabs).toContain("aria-label=\"تبويبات البطاقة\"");
        expect(tabs).not.toContain('السكرتير');
        expect(tabs).not.toContain('secretaryCount');
        expect(panelBody).not.toContain('HomeHubSecretaryPanel');
        expect(panelBody).not.toContain('LazyHomeHubSecretaryPanel');
    });

    it('مسار التنبيهات الافتراضي تبعية ثابتة؛ التثبيت والأوراق كسولة', () => {
        const alerts = readFileSync(join(components, 'HomeHubAlertsPanel.tsx'), 'utf8');
        const alertsPrimary = readFileSync(join(components, 'HomeHubAlertsPrimaryBody.tsx'), 'utf8');
        const pins = readFileSync(join(components, 'HomeHubPinsPanel.tsx'), 'utf8');
        const panelBody = readFileSync(join(components, 'HomeHubPanelBody.tsx'), 'utf8');
        const vite = readFileSync(join(root, 'vite.config.mts'), 'utf8');
        const tabs = readFileSync(join(components, 'HubPanelTabs.tsx'), 'utf8');
        const prefetch = readFileSync(join(hub, 'homeHub/homeHubPanelPrefetch.ts'), 'utf8');
        expect(alerts).not.toContain('LazyHomeHubAlertsPrimaryBody');
        expect(alerts).toContain("from './HomeHubAlertsPrimaryBody'");
        expect(alerts).not.toContain('LazyHomeHubUrgentMoreOverlay');
        expect(alertsPrimary).toContain('LazyHomeHubUrgentMoreOverlay');
        expect(alertsPrimary).toContain('LazyHomeHubAlertsMoreOverlay');
        expect(alertsPrimary).toContain("import('./HomeHubUrgentMoreOverlay')");
        expect(pins).toContain('LazyHomeHubPinsMoreOverlay');
        expect(pins).toContain("import('./HomeHubPinsMoreOverlay')");
        expect(pins).toContain('HOME_HUB_FULLY_EMPTY_COPY');
        expect(pins).toContain('hubFullyEmpty');
        expect(panelBody).toContain('LazyHomeHubPinsPanel');
        expect(panelBody).not.toContain('LazyHomeHubAlertsPanel');
        expect(panelBody).toContain("from './HomeHubAlertsPanel'");
        expect(panelBody).toContain('prefetchHomeHubPinsPanel');
        expect(panelBody).toContain('pinsEverOpened');
        expect(tabs).toContain('prefetchHomeHubPinsPanel');
        expect(tabs).not.toContain('onPrefetchPanel');
        expect(prefetch).toContain("import('../components/HomeHubPinsPanel')");
        expect(prefetch).not.toContain('prefetchHomeHubPanelChunk');
        expect(vite).toContain("return 'lawyer-home-hub-alerts-feed'");
        expect(vite).toContain('HomeHubAlertsPanel');
        expect(panelBody).toContain('home-hub-pins-loading');
        expect(panelBody).not.toContain('fallback={null}');
        expect(panelBody).toContain('hubFullyEmpty={vm.hubFullyEmpty}');
        expect(panelBody).toContain('home-hub-pins-empty');
        expect(alertsPrimary).toContain('useHomeHubAlertsOverflowOverlays');
        expect(alertsPrimary).toContain('prefetchHomeHubUrgentOverlay');
        expect(alertsPrimary).toContain('prefetchHomeHubUpcomingOverlay');
        const overflowHook = readFileSync(
            join(hub, 'hooks/useHomeHubAlertsOverflowOverlays.ts'),
            'utf8',
        );
        expect(overflowHook).toContain('if (isUrgentTab && urgentOverflowCount > 0)');
        expect(overflowHook).toContain('if (!isUrgentTab && upcomingOverflowCount > 0)');
        expect(alertsPrimary).toContain('HomeHubOverlayChunkFallback');
        expect(alertsPrimary).not.toContain('fallback={null}');
        expect(pins).toContain('HomeHubOverlayChunkFallback');
        expect(pins).not.toContain('fallback={null}');
        expect(vite).toContain("return 'lawyer-home-hub-card'");
        expect(vite).toContain("return 'lawyer-home-hub-overlays'");
        expect(vite).toContain("return 'lawyer-home-hub-pins'");
        expect(vite).toContain('useClusterAggregatorGated');
        const hubVm = readFileSync(join(hub, 'hooks/useLawyerHomeHubCard.ts'), 'utf8');
        expect(hubVm).toContain('pinsAggregatorInput');
        expect(hubVm).not.toContain('useClusterAggregatorGated');
        expect(hubVm).toContain('createHomeHubGuardedActions');
        expect(hubVm).toMatch(/useMemo\(\s*\(\)\s*=>\s*\n?\s*createHomeHubGuardedActions/s);
        expect(pins).toContain('useClusterAggregatorGated');
        expect(pins).toContain('aggregatorInput');
        expect(panelBody).toContain('enabled={vm.hubPanel === \'pins\'}');
        const life = readFileSync(join(hub, 'hooks/useHomeHubLifecycle.ts'), 'utf8');
        expect(life).not.toContain('readHomeHubRadarCache');
        expect(life).not.toContain('peekHomeHubRadarCache');
        expect(life).not.toContain('peekHomeHubSecretaryAlertsCache');
        expect(life).toContain('hadRadarCache');
        expect(life).toContain('hadAlertsCache');
        expect(life).toContain("markHomeHubPerfPhase('first-paint')");
        expect(life).toContain("markHomeHubPerfPhase('interactive')");
        expect(existsSync(join(hub, 'hooks/useHomeHubDeferredBadgeCounts.ts'))).toBe(false);
        const badges = readFileSync(join(hub, 'hooks/useHomeHubBadgeSettling.ts'), 'utf8');
        const live = readFileSync(join(hub, 'hooks/useHomeHubAlertsLive.ts'), 'utf8');
        expect(badges).toContain('peekHomeHubRadarUrgentForBadges');
        expect(badges).toContain('useHomeHubBootReveal');
        expect(badges).not.toContain('useHomeHubDeferredBadgeCounts');
        const radarCache = readFileSync(
            join(root, 'src/app/services/alerts/homeHubRadarWarmCache.ts'),
            'utf8',
        );
        expect(radarCache).not.toContain('readHomeHubRadarCache');
        expect(existsSync(join(root, 'src/app/services/alerts/homeHubCarouselVirtual.ts'))).toBe(false);
        const pinsVirtual = readFileSync(
            join(root, 'src/app/services/alerts/homeHubPinsVirtual.ts'),
            'utf8',
        );
        expect(pinsVirtual).not.toContain('shouldWindowHomeHubCarousel');
        expect(pinsVirtual).not.toContain('shouldRenderHomeHubCarouselSlide');
        expect(pinsVirtual).toContain('shouldVirtualizeHomeHubPins');
        expect(live).not.toContain('radarUrgentForAlerts');
        expect(live).not.toContain('filterHomeHubRadarEvents');
        const cardLogic = readFileSync(
            join(root, 'src/app/services/alerts/homeHubCardLogic.ts'),
            'utf8',
        );
        expect(cardLogic).not.toContain('filterRadarEventsExcludingCalendarAlerts');
        expect(cardLogic).not.toContain('export function filterHomeHubRadarEvents');
        expect(cardLogic).toContain('filterHomeHubUrgentRadarEvents');
        const alertsCss = readFileSync(join(hub, 'homeHubAlertsFx.css'), 'utf8');
        expect(alertsCss).toMatch(/\.hami-hub-alerts-feed[\s\S]*contain:\s*layout style/);
    });

    it('CSS مُقسّم: shell / pins / alerts / overlay — pins more بلا سحب alerts', () => {
        const shell = readFileSync(join(hub, 'homeHubCardFx.css'), 'utf8');
        const pinsCss = readFileSync(join(hub, 'homeHubPinsFx.css'), 'utf8');
        const alertsCss = readFileSync(join(hub, 'homeHubAlertsFx.css'), 'utf8');
        const overlayCss = readFileSync(join(hub, 'homeHubOverlayFx.css'), 'utf8');
        const pinsPanel = readFileSync(join(components, 'HomeHubPinsPanel.tsx'), 'utf8');
        const alertsPanel = readFileSync(join(components, 'HomeHubAlertsPanel.tsx'), 'utf8');
        const moreShell = readFileSync(join(components, 'HomeHubMoreOverlayShell.tsx'), 'utf8');
        const alertRow = readFileSync(join(components, 'HomeHubAlertRow.tsx'), 'utf8');

        for (const dead of [
            'hami-hub-scheduled',
            'hami-hub-spark-insights',
            'hami-hub-pins-scroll',
            'hami-hub-alerts-loading__tabs',
            '@keyframes hami-hub-alerts-pulse',
            '.hami-hub-radar__more-trigger',
            'hami-home-hub-entry-sheet',
            'hami-hub-secretary',
            'hami-hub-sec-card',
            '.hami-hub-radar__meta {',
        ]) {
            expect(shell).not.toContain(dead);
            expect(pinsCss).not.toContain(dead);
            expect(alertsCss).not.toContain(dead);
            expect(overlayCss).not.toContain(dead);
        }
        expect(shell).not.toMatch(/(?<!tab-)hami-hub-more-trigger/);
        expect(pinsCss).not.toMatch(/(?<!tab-)hami-hub-more-trigger/);
        expect(alertsCss).not.toMatch(/(?<!tab-)hami-hub-more-trigger/);
        expect(overlayCss).not.toMatch(/(?<!tab-)hami-hub-more-trigger/);

        expect(shell).not.toContain('.hami-hub-radar-overlay__body--scroll');
        expect(shell).not.toContain("[data-testid='home-hub-pins-loading']");
        expect(shell).not.toContain('.hami-hub-horizon-row');
        expect(shell).toContain('.hami-hub-tab-more-trigger');
        expect(shell).not.toContain('.hami-hub-tab__pill');
        expect(shell.length).toBeLessThan(5_500);

        expect(pinsCss).toContain("[data-testid='home-hub-pins-loading']");
        expect(pinsPanel).toMatch(/import ['"]\.\/\.\.\/homeHubPinsFx\.css['"]/);

        expect(alertsCss).not.toContain('.hami-hub-radar-overlay__');
        expect(alertsCss).toContain('.hami-hub-alert-row');
        expect((alertsCss.match(/\.hami-hub-horizon-row\s*\{/g) ?? []).length).toBe(1);
        expect(alertsPanel).toMatch(/import ['"]\.\/\.\.\/homeHubAlertsFx\.css['"]/);

        expect(overlayCss).toContain('.hami-hub-radar-overlay__body--scroll');
        expect(overlayCss).toContain("html[data-hami-reduce-motion='1'] .hami-hub-radar-overlay__close");
        expect(overlayCss.length).toBeLessThan(6_000);
        expect(moreShell).toMatch(/import ['"]\.\.\/homeHubOverlayFx\.css['"]/);
        expect(moreShell).not.toMatch(/homeHubAlertsFx\.css/);

        expect(alertRow).not.toMatch(/from ['"]@\/app\/stores\/workspaceStore['"]/);
        expect(alertRow).toContain('isPinned');

        const alertsPrimary = readFileSync(join(components, 'HomeHubAlertsPrimaryBody.tsx'), 'utf8');
        expect(alertsPrimary).not.toContain('useMobileKeyboardInset');
        expect(moreShell).toContain('useMobileKeyboardInset(open)');
        expect(moreShell).toContain('homeHubKeyboardFeedStyle');
        expect(moreShell).toContain('data-hami-overlay-safe');
        const homeFx = readFileSync(
            join(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );
        expect(homeFx).toContain('.hami-hub-tile-face');
        expect(homeFx).toContain('.hami-hub-tab__pill');
        expect(homeFx).not.toContain('.hami-hub-tile--half');
        expect(homeFx).not.toContain('.hami-hub-tile--route');
        expect(homeFx).not.toContain('.hami-hub-tile--hero');
        expect(homeFx).not.toContain('.hami-hub-hero-icon');
        expect(homeFx).not.toContain('.hami-hub-tile-body');
        expect(homeFx).not.toContain('.hami-hub-title--hero');
        expect(homeFx).not.toContain('.hami-hub-icon-badge-press');
        expect(existsSync(join(root, 'src/app/components/lawyer/dashboard/commandHub/assets/forum-meridian-emblem.png'))).toBe(
            false,
        );
        expect(existsSync(join(root, 'src/app/components/lawyer/dashboard/commandHub/assets/forum-meridian-emblem.webp'))).toBe(
            false,
        );
        expect(existsSync(join(root, 'scripts/optimize-forum-emblem.mjs'))).toBe(false);
    });
});

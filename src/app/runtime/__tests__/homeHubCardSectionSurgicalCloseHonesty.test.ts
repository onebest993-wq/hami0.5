import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readHomeTabImplSource } from './readHomeTabImplSource';

const root = process.cwd();

describe('home hub card section surgical close honesty', () => {
    it('الرادار مربوط بـ dismissHomeHubRadarId عبر onDismissRadar', () => {
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
        const hook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/hooks/useLawyerHomeHubCard.ts',
            ),
            'utf8',
        );
        expect(hook).toContain('createHomeHubGuardedActions');
        const panelBody = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPanelBody.tsx',
            ),
            'utf8',
        );
        expect(panelBody).toContain('onDismissRadar={vm.guardedDismissRadar}');
        expect(panelBody).toContain('hidden={panelHidden');
        for (const panelFile of ['HomeHubAlertsPanel.tsx', 'HomeHubPinsPanel.tsx']) {
            const panelSrc = fs.readFileSync(
                path.join(
                    root,
                    `src/app/components/lawyer/LawyerHomeHubCard/components/${panelFile}`,
                ),
                'utf8',
            );
            expect(panelSrc).not.toMatch(/style=\{\{\s*display:/);
        }
        expect(panelBody).toContain('hubFullyEmpty={vm.hubFullyEmpty}');
    });

    it('تنقّل اللوحة يستخدم hasLocalAppSession(userId) لا null', () => {
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(nav).toContain('userId: string | null');
        expect(nav).toContain('hasLocalAppSession(userId)');
        expect(nav).not.toContain('hasLocalAppSession(null)');
        const orch = fs.readFileSync(
            path.join(
                root,
                'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts',
            ),
            'utf8',
        );
        expect(orch).toContain('navigationSurfacesProps');
        expect(orch).toContain('userId: shellAuthUserId');
        expect(orch).not.toMatch(/useLawyerDashboardNavigation\(/);
        const island = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardNavigationIsland.tsx',
            ),
            'utf8',
        );
        expect(island).toContain('useLawyerDashboardNavigation');
        expect(island).toContain('useAfterFirstTabOpen');
    });

    it('القوائم تستخدم HomeHubPinRow المشترك', () => {
        const panel = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinsPanel.tsx',
            ),
            'utf8',
        );
        expect(panel).toContain("from './HomeHubPinRow'");
        expect(panel).toContain('<HomeHubPinRow');
        const virtual = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinsVirtualList.tsx',
            ),
            'utf8',
        );
        expect(virtual).toContain("from './HomeHubPinRow'");
        expect(virtual).not.toMatch(/function HomeHubPinRow\(/);
    });

    it('HomeHubErrorBoundary خفيف تحت dashboard بلا سحب LawyerHomeHubCard إلى HomeTab', () => {
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/HomeHubErrorBoundary.tsx'),
            ),
        ).toBe(true);
        const live = readHomeTabImplSource(root);
        const content = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/HomeTabContent.tsx',
            ),
            'utf8',
        );
        const wrap = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx',
            ),
            'utf8',
        );
        expect(live).toContain(
            "from '@/app/components/lawyer/dashboard/HomeHubErrorBoundary'",
        );
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard/HomeHubErrorBoundary.tsx'),
            ),
        ).toBe(false);
        expect(live).not.toMatch(/from '@\/app\/stores\/workspaceStore'/);
        expect(live).not.toMatch(/from '@\/app\/services\/settings\/apply'/);
        expect(wrap).toContain('HomeTabPaintShell');
        expect(content).not.toContain('HomeLayoutScrollRoot');
        expect(live).not.toMatch(/from ['"]lucide-react['"]/);
        expect(live).toContain('LazyLawyerHomeHubCard');
        expect(live).toContain('loadLawyerHomeHubCardModule');
        const boundary = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/HomeHubErrorBoundary.tsx'),
            'utf8',
        );
        expect(boundary).not.toContain('lucide-react');
        expect(boundary).not.toContain('@/app/components/ui/ErrorBoundary');
        expect(boundary).toContain('HomeLiteErrorBoundary');
        expect(boundary).toContain('HomeLiteErrorFallback');
        expect(boundary).toContain('onRetry={retry}');
        /* حُذف `HomeDockChromeErrorBoundary.tsx` — بلا مستورد؛ الحدّان الباقيان هما
         * ما يلفّ الشجرة فعلاً */
        for (const f of ['HomeMainZoneErrorBoundary.tsx', 'LawyerHomeTabErrorBoundary.tsx']) {
            const src = fs.readFileSync(
                path.join(root, 'src/app/components/lawyer/dashboard', f),
                'utf8',
            );
            expect(src).toContain('HomeLiteErrorBoundary');
            expect(src).toContain('HomeLiteErrorFallback');
            expect(src).toContain('onRetry={retry}');
            expect(src).not.toContain('@/app/components/ui/ErrorBoundary');
        }
    });

    it('مسار غير صالح يُنبّه مثل CommandCenterOverlays', () => {
        const guards = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/homeHub/homeHubGuardedActions.ts',
            ),
            'utf8',
        );
        expect(guards).toContain('isSafeHomeHubNavigateRoute');
        expect(guards).toContain('تعذر فتح هذا العنصر — المسار غير صالح');
    });

    it('أزرار أفق التصفية وصف التنبيه الحي ≥44px', () => {
        const horizon = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NeuralAlertsCard/HorizonFilterTabs.tsx'),
            'utf8',
        );
        expect(horizon).toContain('min-h-[44px]');
        expect(horizon).not.toContain('min-h-[36px]');
        expect(horizon).toContain('ArrowLeft');
        expect(horizon).toContain('tabIndex={isActive ? 0 : -1}');
        expect(horizon).toContain('feedId?: string');
        expect(horizon).toContain("idPrefix = 'horizon'");
        expect(horizon).not.toContain('home-hub-horizon-${key}');
        expect(horizon).not.toContain('aria-controls="home-hub-alerts-feed"');
        const primary = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubAlertsPrimaryBody.tsx',
            ),
            'utf8',
        );
        expect(primary).toContain('feedId="home-hub-alerts-feed"');
        expect(primary).toContain('idPrefix="home-hub-horizon"');
        expect(primary).toContain('id="home-hub-alerts-feed"');
        expect(primary).toContain('role="tabpanel"');
        expect(primary).toContain('prefetchHomeHubUrgentOverlay');
        expect(primary).toContain('prefetchHomeHubUpcomingOverlay');
        expect(primary).toContain('useHomeHubAlertsOverflowOverlays');
        const overflowHook = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubAlertsOverflowOverlays.ts',
            ),
            'utf8',
        );
        expect(overflowHook).toContain('if (isUrgentTab && urgentOverflowCount > 0)');
        expect(overflowHook).toContain('if (!isUrgentTab && upcomingOverflowCount > 0)');
        const more = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubTabMoreTrigger.tsx',
            ),
            'utf8',
        );
        expect(more).toContain('onPointerDown: onPrefetch');
        const fx = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard/homeHubAlertsFx.css'),
            'utf8',
        );
        expect(fx).toMatch(/\.hami-hub-alert-row__action[\s\S]*min-height:\s*44px/);
        const pinRow = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard/components/HomeHubPinRow.tsx'),
            'utf8',
        );
        expect(pinRow).toContain('min-h-[44px]');
        expect(pinRow).toContain('aria-hidden');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/NeuralAlertsCard/AlertCardItem.tsx'),
            ),
        ).toBe(false);
    });

    it('مسار البطاقة من home-hub-card ما زال قائماً', () => {
        const card = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard.tsx'),
            'utf8',
        );
        expect(card).toContain('home-hub-card');
        expect(card).toContain('data-hub-active-panel');
        expect(card).toContain('HomeHubPanelBody');
        /*
         * حُذف `HomeHubCardShellFallback.tsx` مع `LawyerHomeHubCardHost.tsx`: الأوّل
         * لم يستورده إلا الثاني، والثاني لم يستورده أحد. البطاقة تُركَّب اليوم من
         * `LawyerDashboardHomeTab` مباشرة — وهو ما يحرسه الفحص أعلاه.
         */
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/dashboard/HomeHubCardShellFallback.tsx'),
            ),
        ).toBe(false);
        const tabs = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/LawyerHomeHubCard/components/HubPanelTabs.tsx',
            ),
            'utf8',
        );
        expect(tabs).toContain('home-hub-tab-${panel}');
        expect(tabs).toContain('aria-controls');
        expect(tabs).toContain("data-testid={`home-hub-tab-${panel}`}");
    });

    it('دفعة التنبيهات للبطاقة تُقارن بالمحتوى؛ البصمة تتبّع التواريخ', () => {
        const bg = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardBackgroundServices.tsx',
            ),
            'utf8',
        );
        expect(bg).toContain('alertsHubPayloadUnchanged');
        expect(bg).not.toMatch(/prev\.alerts\.every\(\(a, i\) => a\.id === alerts\[i\]\?\.id\)/);
        const hook = fs.readFileSync(path.join(root, 'src/app/hooks/useAppAlerts.ts'), 'utf8');
        expect(hook).toContain('buildAlertsDataSignature');
        expect(hook).toContain('QUANTUM_TASKS_CHANGED_EVENT');
        const nav = fs.readFileSync(path.join(root, 'src/app/services/alertNavigation.ts'), 'utf8');
        expect(nav).toContain('openVisitationWorkspace');
        expect(nav).toContain('EXECUTION_VISIT_NEXT_EVENT_ID');
        const open = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(open).toContain('requestOpenExecutionVisitationWorkspace');
        expect(open).toContain('HOME_HUB_CARD_FEATURE');
        const secretary = fs.readFileSync(
            path.join(root, 'src/app/services/SecretaryOrchestrator.ts'),
            'utf8',
        );
        expect(secretary).toContain('buildCalendarAlerts');
        expect(secretary).not.toContain('buildRequestAlerts');
        expect(secretary).toContain('buildFieldTaskAlerts');
        expect(secretary).not.toContain('buildLawsuitAlerts');
        expect(secretary).not.toContain('buildExecutionAlerts');
        expect(secretary).not.toContain('buildFinancialAlerts');
        expect(secretary).not.toContain('TransactionsThreadingDB');
        expect(secretary).toContain('titleFallback');
        const registry = fs.readFileSync(
            path.join(root, 'src/app/services/alertDossierRegistry.ts'),
            'utf8',
        );
        expect(registry).toContain("mod === 'threading'");
    });
});

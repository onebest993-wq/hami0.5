import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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
        for (const panelFile of [
            'HomeHubAlertsPanel.tsx',
            'HomeHubSecretaryPanel.tsx',
            'HomeHubPinsPanel.tsx',
        ]) {
            const panelSrc = fs.readFileSync(
                path.join(
                    root,
                    `src/app/components/lawyer/LawyerHomeHubCard/components/${panelFile}`,
                ),
                'utf8',
            );
            expect(panelSrc).not.toMatch(/style=\{\{\s*display:/);
        }
    });

    it('تنقّل اللوحة يستخدم isRealSignedIn(userId) لا null', () => {
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(nav).toContain('userId: string | null');
        expect(nav).toContain('isRealSignedIn(userId)');
        expect(nav).not.toContain('isRealSignedIn(null)');
        const orch = fs.readFileSync(
            path.join(
                root,
                'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts',
            ),
            'utf8',
        );
        expect(orch).toMatch(
            /useLawyerDashboardNavigation\(\{[\s\S]*?userId:\s*shellAuthUserId/,
        );
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
        const live = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx',
            ),
            'utf8',
        );
        expect(live).toContain(
            "from '@/app/components/lawyer/dashboard/HomeHubErrorBoundary'",
        );
        expect(live).not.toContain(
            "from '@/app/components/lawyer/LawyerHomeHubCard/HomeHubErrorBoundary'",
        );
        expect(live).not.toMatch(/from '@\/app\/stores\/workspaceStore'/);
        expect(live).not.toMatch(/from '@\/app\/services\/settings\/apply'/);
        expect(live).toContain('HomeLayoutScrollRoot');
        expect(live).not.toMatch(/from ['"]lucide-react['"]/);
        expect(live).toContain('LawyerHomeHubCard');
        const boundary = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/HomeHubErrorBoundary.tsx'),
            'utf8',
        );
        expect(boundary).not.toContain('lucide-react');
        expect(boundary).not.toContain('@/app/components/ui/ErrorBoundary');
        expect(boundary).toContain('HomeLiteErrorBoundary');
        for (const f of [
            'HomeDockChromeErrorBoundary.tsx',
            'HomeMainZoneErrorBoundary.tsx',
            'LawyerHomeTabErrorBoundary.tsx',
        ]) {
            const src = fs.readFileSync(
                path.join(root, 'src/app/components/lawyer/dashboard', f),
                'utf8',
            );
            expect(src).toContain('HomeLiteErrorBoundary');
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

    it('أزرار أفق التصفية وبطاقة التنبيه ≥44px', () => {
        const horizon = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NeuralAlertsCard/HorizonFilterTabs.tsx'),
            'utf8',
        );
        expect(horizon).toContain('min-h-[44px]');
        const alertCard = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NeuralAlertsCard/AlertCardItem.tsx'),
            'utf8',
        );
        expect(alertCard).toContain('useBodyScrollLock(showDetails)');
        expect(alertCard).toContain('min-w-[44px] min-h-[44px]');
        expect(alertCard).toContain('safe-area-inset-top');
    });

    it('مسار البطاقة من home-hub-card ما زال قائماً', () => {
        const card = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LawyerHomeHubCard.tsx'),
            'utf8',
        );
        expect(card).toContain('home-hub-card');
        expect(card).toContain('data-hub-active-panel');
        expect(card).toContain('HomeHubPanelBody');
        const shell = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/HomeHubCardShellFallback.tsx'),
            'utf8',
        );
        expect(shell).toContain('البطاقة الذكية');
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
});

import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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
    });

    it('H7/H10: Cap + Escape على تفاصيل التنبيه', () => {
        const alertCard = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/NeuralAlertsCard/AlertCardItem.tsx'),
            'utf8',
        );
        expect(alertCard).toContain('registerNativeBackHandler');
        expect(alertCard).toContain("e.key !== 'Escape'");
        expect(alertCard).toContain('useBodyScrollLock(showDetails)');
        expect(alertCard).toContain('safe-area-inset-top');
    });

    it('H2: تنقّل اللوحة يستخدم هوية حقيقية', () => {
        const nav = fs.readFileSync(
            path.join(root, 'src/app/hooks/useLawyerDashboardNavigation.ts'),
            'utf8',
        );
        expect(nav).toContain('isRealSignedIn(userId)');
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
        expect(fx).toMatch(/min-height:\s*44px/);
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
        const home = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(home).not.toContain('alertsStageReady');
        expect(home).not.toContain('homeHubCardSessionKey');
        const homeHook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab.ts'),
            'utf8',
        );
        expect(homeHook).not.toContain('homeHubCardSessionKey');
    });

    it('H8: ErrorBoundary + بطاقة Hub مدمجة في HomeTab (بلا Suspense waterfall)', () => {
        const home = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(home).toContain('HomeHubErrorBoundary');
        expect(home).toContain('LawyerHomeHubCard');
        expect(home).not.toContain('LazyLawyerHomeHubCard');
        expect(home).toContain('prefetchLawyerHomeHubCard');
        const preload = fs.readFileSync(path.join(root, 'src/boot/bootCriticalPreload.ts'), 'utf8');
        expect(preload).toContain('LawyerHomeHubCard');
    });
});

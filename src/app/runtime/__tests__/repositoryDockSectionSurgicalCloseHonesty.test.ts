import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('repository dock section surgical close honesty', () => {
    it('بعد interactive: تسخين فقط بلا armRepositoryHost', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts'),
            'utf8',
        );
        expect(hook).toContain('prefetchRepositoryAfterBootReveal');
        const warmBlock = hook.match(
            /const scheduleWarm = \(\) => \{[\s\S]*?\n        \};/,
        )?.[0];
        expect(warmBlock).toBeTruthy();
        expect(warmBlock).toContain('prefetchRepositoryAfterBootReveal');
        expect(warmBlock).not.toContain('armRepositoryHost');
        expect(hook).toContain('isRealSignedIn(userId)');
        expect(hook).not.toContain('isRealSignedIn(null)');
    });

    it('مسار الفتح لا يكرر prime/hydrate بعد arm', () => {
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('warmRepositoryOnOpen');
        expect(openFlow).not.toContain('primeRepositoryShellMount');
        expect(openFlow).not.toContain('hydrateRepositoryBootShellForInstantOpen');
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts'),
            'utf8',
        );
        expect(hook).toContain('commitRepositoryOpen');
    });

    it('MainView: Repository Entry sync بلا Suspense؛ Host sync داخل Entry', () => {
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('LawyerDashboardRepositoryOverlayEntry');
        expect(main).not.toContain('LazyRepositoryOverlayEntry');
        expect(main).not.toContain('RepositoryHubLoadingFallback');
        expect(main).toMatch(
            /repositoryLive\s*\?\s*\(\s*<LawyerDashboardRepositoryOverlayEntry/,
        );
        const entry = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry.tsx',
            ),
            'utf8',
        );
        expect(entry).toContain('SmartRepositoryHost');
        expect(entry).not.toContain('lazyWithRetry');
        expect(entry).not.toMatch(/<Suspense\b/);
        expect(entry).not.toContain('LazySmartRepositoryHost');
    });

    it('pointerPrime للمستودع prefetch + prime host بلا hydrate', () => {
        const gate = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts'),
            'utf8',
        );
        const repoPrime = gate.match(
            /if \([\s\S]*?widgetId === 'dockRepository'[\s\S]*?\) \{[\s\S]*?return;\s*\}/,
        )?.[0];
        expect(repoPrime).toBeTruthy();
        expect(repoPrime).toContain("prefetchDockWidgetIntentImmediate('dockRepository', 'hover')");
        expect(repoPrime).toContain('dispatchRepositoryPrimeHost');
        expect(repoPrime).not.toContain('paintRepositoryInstantChrome()');
        expect(repoPrime).not.toContain('hydrateRepository');
        expect(gate).not.toContain("from '@/app/runtime/repositoryBootHydrator'");
    });

    it('بلاطات الدوك في الشبكة الرئيسية بلا شريط سفلي', () => {
        const homeTab = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(homeTab).toContain('DockHalfTile');
        expect(homeTab).toContain('bindDockWidgetPointerHandlers');
        expect(homeTab).not.toContain('LegalCommandCenterDock');
        expect(homeTab).not.toContain('home-bottom-chrome');
    });

    it('المستودع حي في orchestration خارج الجزيرة المؤجّلة (مثل التقويم)', () => {
        const orch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
            'utf8',
        );
        expect(orch).toContain('useLawyerDashboardRepository');
        expect(orch).toContain('repositoryFeature');
        const stubs = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createDeferredFeatureStubs.ts'),
            'utf8',
        );
        expect(stubs).not.toContain("requestArm('repository')");
        expect(stubs).not.toContain('openRepository:');
        const deferred = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(deferred).not.toContain('useLawyerDashboardRepository');
        expect(deferred).toContain('params.openNotepad');
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('paintRepositoryInstantChrome');
        expect(openFlow).toContain('commitRepositoryClose');
        const tabBundle = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle.ts'),
            'utf8',
        );
        expect(tabBundle).toMatch(
            /onOpenRepository:\s*\(opts\)\s*=>\s*\{\s*params\.openRepository\(opts\);\s*\}/,
        );
        expect(tabBundle).not.toMatch(
            /onOpenRepository:[\s\S]*?primeNotepadShellMount\(\);[\s\S]*?openRepository/,
        );
    });

    it('مسار المستودع بلا debug 127.0.0.1:7777', () => {
        const files = [
            'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts',
            'src/app/components/lawyer/LegalCommandCenterDock.tsx',
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry.tsx',
            'src/app/hooks/lawyerDashboard/repositoryIntentWarm.ts',
            'src/app/components/lawyer/SmartRepository/SmartRepositoryHost.tsx',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src, rel).not.toContain('127.0.0.1:7777');
        }
    });
});

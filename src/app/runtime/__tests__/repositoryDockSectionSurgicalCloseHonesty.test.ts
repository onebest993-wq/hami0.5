import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { readHomeTabImplSource } from './readHomeTabImplSource';
import { readLawyerDashboardMainViewSurface } from './readLawyerDashboardMainViewSurface';

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
        expect(hook).toContain('hasLocalAppSession(userId)');
        expect(hook).not.toContain('hasLocalAppSession(null)');
        expect(hook).not.toContain('REPOSITORY_SHELL_HYDRATED_EVENT');
        expect(hook).not.toContain('prefetchRepositoryOverlayChunks');
        expect(hook).toContain('بلا تركيب Host حتى الفتح');
        expect(hook).not.toContain('ركّب Host مخفياً فور وجود هوية');
        const identityBlock = hook.match(
            /\/\*\* تسخين المقطع فور وجود هوية[\s\S]*?\}, \[userId\]\);/,
        )?.[0];
        expect(identityBlock).toBeTruthy();
        expect(identityBlock).not.toContain('armRepositoryHost');
        const primeBlock = hook.match(
            /const primeRepositoryShellMount = useCallback\(\(\) => \{[\s\S]*?\}, \[userId\]\);/,
        )?.[0];
        expect(primeBlock).toBeTruthy();
        expect(primeBlock).not.toContain('armRepositoryHost');
        const hydrator = fs.readFileSync(
            path.join(root, 'src/app/runtime/repositoryBootHydrator.ts'),
            'utf8',
        );
        expect(hydrator).toContain('تسخين مقطع بلا تركيب Host حتى الفتح');
        expect(hydrator).not.toContain('يركّب Host مخفياً قبل الـ click');
        expect(hydrator).not.toContain('REPOSITORY_SHELL_HYDRATED_EVENT');
        expect(hydrator).not.toContain('dispatchHydratedOnce');
    });

    it('مسار الفتح لا يكرر prime/hydrate بعد arm', () => {
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toContain('warmRepositoryOnOpen');
        expect(openFlow).toContain('prefetchRepositoryHubModule');
        expect(openFlow).not.toContain('prefetchRepositoryHubAndOverlay');
        expect(openFlow).not.toContain('prefetchRepositoryOverlayChunks');
        expect(openFlow).not.toContain('primeRepositoryShellMount');
        expect(openFlow).not.toContain('hydrateRepositoryBootShellForInstantOpen');
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts'),
            'utf8',
        );
        expect(hook).toContain('commitRepositoryOpen');
    });

    it('MainView: Repository Entry sync بلا Suspense؛ Host sync داخل Entry', () => {
        const main = readLawyerDashboardMainViewSurface();
        /* كسول + تسخين بعد content-ready — كان يجرّ ٣٦٤ ك.ب إلى مقطع اللوحة */
        expect(main).toContain('LazyRepositoryOverlayEntry');
        expect(main).toContain('warmOverlayEntryChunks');
        expect(main).not.toContain('RepositoryHubLoadingFallback');
        expect(main).toMatch(
            /repositoryLive\s*\?\s*\(\s*<Suspense fallback=\{null\}>\s*<LazyRepositoryOverlayEntry/,
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
        expect(entry).not.toContain('SUSPENDED_GLOBAL_NOTES');
        expect(
            fs.existsSync(
                path.join(root, 'src/app/components/lawyer/SmartRepository/SmartRepositoryModalEntry.tsx'),
            ),
        ).toBe(false);
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
        const homeTab = readHomeTabImplSource(root);
        expect(homeTab).toContain('DockHalfTile');
        expect(homeTab).toContain('bindDockWidgetPointerHandlers');
        expect(homeTab).not.toContain('LegalCommandCenterDock');
        expect(homeTab).not.toContain('home-bottom-chrome');
    });

    it('المستودع في PreDockFeatureSurfaces كسول بعد first-tab-open (خارج orchestration stem)', () => {
        const orch = [
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration.ts'),
                'utf8',
            ),
            fs.readFileSync(
                path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration.ts'),
                'utf8',
            ),
        ].join('\n');
        expect(orch).toContain('createPreDockFeatureStubs');
        expect(orch).toContain('repositoryFeature');
        expect(orch).not.toMatch(/import \{[^}]*useLawyerDashboardRepository[^}]*\} from/);
        const preDockStubs = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/createPreDockFeatureStubs.ts'),
            'utf8',
        );
        expect(preDockStubs).toContain("requestArm('repository')");
        expect(preDockStubs).toContain('openRepository:');
        const preDock = fs.readFileSync(
            path.join(
                root,
                'src/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces.tsx',
            ),
            'utf8',
        );
        expect(preDock).toContain('useLawyerDashboardRepository');
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
        expect(openFlow).toContain('executeRepositoryOverlayClose');
        expect(openFlow).toContain('beginHubLayerExit');
        expect(openFlow).toContain('persistRepositorySessionOpen');
        expect(openFlow).toContain('blurFocusWithin');
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartRepository/SmartRepositoryHost.tsx'),
            'utf8',
        );
        expect(host).toMatch(/import \{ SmartRepositoryModal \} from/);
        expect(host).not.toContain('RepositoryInstantShell');
        const modal = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/SmartRepositoryModal.tsx'),
            'utf8',
        );
        expect(modal).toContain("import './SmartRepository/repositoryChrome.css'");
        const chunks = fs.readFileSync(
            path.join(root, 'src/app/runtime/overlayEntryChunks.ts'),
            'utf8',
        );
        expect(chunks).toContain('prefetchRepositoryHubModule');
        const hookClose = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardRepository.ts'),
            'utf8',
        );
        expect(hookClose).toContain("registerDashboardOverlayCloser('repository', closeRepository)");
        expect(hookClose).toContain('readInitialRepositorySession');
        expect(hookClose).toContain('setRepositoryHostMounted(false)');
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
            'src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts',
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

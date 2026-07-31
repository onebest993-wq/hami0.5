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
        const dock = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LegalCommandCenterDock.tsx'),
            'utf8',
        );
        const repoPrime = dock.match(
            /if \(widgetId === 'dockRepository'\) \{[\s\S]*?\n            \}/,
        )?.[0];
        expect(repoPrime).toBeTruthy();
        expect(repoPrime).toContain("prefetchDockWidgetIntentImmediate('dockRepository')");
        expect(repoPrime).toContain('dispatchRepositoryPrimeHost');
        expect(repoPrime).not.toContain('hydrateRepository');
        expect(dock).not.toContain("from '@/app/runtime/repositoryBootHydrator'");
    });

    it('أيقونة dockRepository تستخدم HomeWarehouseIcon', () => {
        const dock = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LegalCommandCenterDock.tsx'),
            'utf8',
        );
        expect(dock).toContain('HomeWarehouseIcon');
        expect(dock).toMatch(/dockRepository:[\s\S]*?icon:\s*HomeWarehouseIcon/);
        expect(dock).not.toMatch(/\bWarehouse\b/);
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

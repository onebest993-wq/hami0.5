import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('field-tasks dock section surgical close honesty', () => {
    it('الـ hook لا يركّب Host المهام عند الإقلاع', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts'),
            'utf8',
        );
        expect(hook).not.toMatch(/useState\(true\)/);
        expect(hook).toMatch(
            /fieldTasksHostMounted[\s\S]*?initialSession\.open && initialSession\.surface === 'sheet'/,
        );
        expect(hook).toContain('isRealSignedIn(userId)');
        expect(hook).not.toContain('isRealSignedIn(null)');
    });

    it('MainView يركّب FieldTasksOverlayEntry sync مثل المعاملات (بلا Suspense skeleton)', () => {
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('LawyerDashboardFieldTasksOverlayEntry');
        expect(main).not.toContain('LazyFieldTasksOverlayEntry');
        expect(main).not.toContain('FieldTasksSheetFallback');
        expect(main).toMatch(
            /fieldTasksLive[\s\S]*?LawyerDashboardFieldTasksOverlayEntry/,
        );
    });

    it('pointerPrime للمهام يُسخّن عند الضغط بلا فتح مبكر أو microtask', () => {
        const gate = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts'),
            'utf8',
        );
        const tasksPrime = gate.match(
            /if \(widgetId === 'dockTasks'\) \{[\s\S]*?return;\s*\}/,
        )?.[0];
        expect(tasksPrime).toBeTruthy();
        expect(tasksPrime).toContain('dispatchFieldTasksPrimeHost');
        expect(tasksPrime).toContain("prefetchDockWidgetIntentImmediate('dockTasks', 'hover')");
        expect(tasksPrime).not.toContain("prefetchDockWidgetIntentImmediate('dockTasks', 'open')");
        expect(tasksPrime).not.toContain('queueMicrotask');
        expect(tasksPrime).not.toContain('hydrateFieldTasksShellForInstantOpen');
        expect(gate).not.toContain("from '@/app/runtime/fieldTasksBootHydrator'");
    });

    it('prefetch open للمهام يستدعي warmFieldTasksOnOpen', () => {
        const prefetch = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch.ts'),
            'utf8',
        );
        const tasksCase = prefetch.match(
            /case 'dockTasks':[\s\S]*?break;/,
        )?.[0];
        expect(tasksCase).toBeTruthy();
        expect(tasksCase).toContain("phase === 'open'");
        expect(tasksCase).toContain('warmFieldTasksOnOpen');
        expect(tasksCase).toContain('warmFieldTasksOnHover');
    });

    it('بلاطة dockTasks في الشبكة الرئيسية بلا أيقونة lucide', () => {
        const tiles = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/commandHub/CommandHubTiles.tsx'),
            'utf8',
        );
        expect(tiles).toContain('DockHalfTile');
        expect(tiles).not.toContain('HomeListChecksIcon');
        expect(tiles).not.toMatch(/\bListChecks\b/);
    });

    it('FieldTasksSheetHost يركّب الستارة مخفية عند keepAlive لـ revealFieldTasksWarmSheet', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetHost.tsx'),
            'utf8',
        );
        expect(host).toContain('keepAlive');
        expect(host).toMatch(/shouldMount = open \|\| keepAlive/);
        expect(host).toMatch(/if \(ResolvedComponent\) \{[\s\S]*?return <ResolvedComponent/);
        expect(host).toMatch(/if \(open\) \{[\s\S]*?return <FieldTasksWarmSheetBridge/);
    });

    it('FieldTasksManagerHost لا يركّب الأجندة في DOM قبل open=true', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksManagerHost.tsx'),
            'utf8',
        );
        expect(host).toMatch(/ResolvedComponent[\s\S]*?if \(!open\) \{[\s\S]*?return null;/);
        expect(host).not.toContain('TasksManagerFallback');
    });

    it('dockTasks يفتح على النقر الطبيعي مع warm موحّد', () => {
        const homeTab = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx'),
            'utf8',
        );
        expect(homeTab).toContain("id === 'dockTasks'");
        expect(homeTab).not.toContain('activateOnPointerDown');
        const gate = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/dockShellPrefetchGate.ts'),
            'utf8',
        );
        expect(gate).toContain("prefetchDockWidgetIntentImmediate('dockTasks', 'hover')");
        const warm = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/fieldTasksIntentWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('LawyerDashboardFieldTasksOverlayEntry');
        expect(warm).toContain('warmFieldTasksSheetPipeline');
        expect(warm).toContain('prefetchTasksManagerModule');
        const hydrate = fs.readFileSync(
            path.join(root, 'src/app/runtime/fieldTasksBootHydrator.ts'),
            'utf8',
        );
        expect(hydrate).toContain('prefetchFieldTasksAfterBootReveal');
        expect(hydrate).toMatch(/hydrateDelayMs[\s\S]*?return 0;/);
    });

    it('مسار المهام بلا debug 127.0.0.1:7777', () => {
        const files = [
            'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts',
            'src/app/components/lawyer/dashboard/LawyerDashboardHomeTab.tsx',
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry.tsx',
            'src/app/hooks/lawyerDashboard/fieldTasksIntentWarm.ts',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src, rel).not.toContain('127.0.0.1:7777');
        }
    });
});

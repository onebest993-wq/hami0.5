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

    it('MainView يعرض FieldTasksSheetFallback أثناء تحميل chunk المهام', () => {
        const main = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/LawyerDashboardMainView.tsx'),
            'utf8',
        );
        expect(main).toContain('FieldTasksSheetFallback');
        expect(main).toMatch(
            /fieldTasksLive[\s\S]*?FieldTasksSheetFallback[\s\S]*?LazyFieldTasksOverlayEntry/,
        );
        const fieldBlock = main.match(
            /\{fieldTasksLive \? \([\s\S]*?\) : null\}/,
        )?.[0];
        expect(fieldBlock).toBeTruthy();
        expect(fieldBlock).not.toMatch(/fallback=\{null\}/);
    });

    it('pointerPrime للمهام لا يكرر hydrate بعد prefetch', () => {
        const dock = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LegalCommandCenterDock.tsx'),
            'utf8',
        );
        const tasksPrime = dock.match(
            /if \(widgetId === 'dockTasks'\) \{[\s\S]*?\n            \}/,
        )?.[0];
        expect(tasksPrime).toBeTruthy();
        expect(tasksPrime).toContain("prefetchDockWidgetIntentImmediate('dockTasks', 'hover')");
        expect(tasksPrime).not.toContain('hydrateFieldTasksShellForInstantOpen');
        expect(dock).not.toContain("from '@/app/runtime/fieldTasksBootHydrator'");
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

    it('أيقونة dockTasks في الشريط تستخدم HomeListChecksIcon', () => {
        const dock = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LegalCommandCenterDock.tsx'),
            'utf8',
        );
        expect(dock).toContain('HomeListChecksIcon');
        expect(dock).toMatch(/dockTasks:[\s\S]*?icon:\s*HomeListChecksIcon/);
        expect(dock).not.toMatch(/\bListChecks\b/);
    });

    it('dockTasks يفتح على pointerdown مثل التقويم + warm يحمّل OverlayEntry', () => {
        const dock = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/LegalCommandCenterDock.tsx'),
            'utf8',
        );
        expect(dock).toContain("widgetId === 'dockTasks'");
        expect(dock).toContain('activateOnPointerDown');
        expect(dock).toContain("prefetchDockWidgetIntentImmediate('dockTasks', 'hover')");
        const warm = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/fieldTasksIntentWarm.ts'),
            'utf8',
        );
        expect(warm).toContain('LawyerDashboardFieldTasksOverlayEntry');
        expect(warm).toContain('scheduleIdleWork');
        expect(warm).toContain('warmTasksManagerIdle');
        expect(warm).not.toMatch(
            /export function warmFieldTasksOnOpen\(\)[\s\S]{0,200}?prefetchTasksManagerModule\(\);/,
        );
        const hydrate = fs.readFileSync(
            path.join(root, 'src/app/runtime/fieldTasksBootHydrator.ts'),
            'utf8',
        );
        expect(hydrate).not.toContain('prefetchTasksManagerModule');
    });

    it('مسار المهام بلا debug 127.0.0.1:7777', () => {
        const files = [
            'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts',
            'src/app/components/lawyer/LegalCommandCenterDock.tsx',
            'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry.tsx',
            'src/app/hooks/lawyerDashboard/fieldTasksIntentWarm.ts',
        ];
        for (const rel of files) {
            const src = fs.readFileSync(path.join(root, rel), 'utf8');
            expect(src, rel).not.toContain('127.0.0.1:7777');
        }
    });
});

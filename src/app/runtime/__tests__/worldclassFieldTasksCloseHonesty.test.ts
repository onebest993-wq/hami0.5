import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('world-class field-tasks close honesty', () => {
    it('T5: fieldTasksHostMounted يبدأ false على cold (بلا session)', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts'),
            'utf8',
        );
        expect(hook).toMatch(
            /fieldTasksHostMounted[\s\S]*?initialSession\.open && initialSession\.surface === 'sheet'/,
        );
        expect(hook).not.toMatch(/useState\(true\)/);
    });

    it('T2: يمسح hosts ويغلق عند غياب هوية حقيقية', () => {
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts'),
            'utf8',
        );
        const authEffect = hook.match(
            /\/\*\* جلسة مهام مفتوحة بلا هوية[\s\S]*?\}, \[userId, withInstantPaint\]\);/,
        )?.[0];
        expect(authEffect).toBeTruthy();
        expect(authEffect).toContain('setFieldTasksHostMounted(false)');
        expect(authEffect).toContain('setFieldTasksManagerHostMounted(false)');
        expect(authEffect).toContain('setFieldTasksSheetOpen(false)');
        expect(authEffect).not.toContain('flushSync');
    });

    it('T9: marks الفتح متزامنة قبل paint', () => {
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/fieldTasks/fieldTasksShellOpenFlow.ts'),
            'utf8',
        );
        expect(openFlow).toMatch(/clearFieldTasksPerfMarks\(\)/);
        expect(openFlow).toMatch(/markFieldTasksPerfPhase\('open-request'\)/);
        const hook = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts'),
            'utf8',
        );
        expect(hook).not.toMatch(
            /loadFieldTasksPerfMetrics\(\)\.then\(\(m\)\s*=>\s*m\.clearFieldTasksPerfMarks/,
        );
    });

    it('T7/T10: Cap native back مربوط في useLawyerDashboardTasksOverlayEscape', () => {
        const escape = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardTasksOverlayEscape.ts'),
            'utf8',
        );
        expect(escape).toContain('registerNativeBackHandler');
        expect(escape).toContain('consumeBackStack');
        expect(escape).toContain('isTasksOverlayEscapeBlocked');
    });

    it('T1: interactive احتياطي في useTasksLifecycle', () => {
        const life = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/useTasksLifecycle.ts'),
            'utf8',
        );
        expect(life).toMatch(/setTimeout\(markInteractiveFallback,\s*1_?200\)/);
        expect(life).toContain('reportedRef');
        expect(life).toContain("markFieldTasksPerfPhase('interactive')");
    });

    it('T3: pointerPrime للمهام بلا hydrate مكرر', () => {
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
    });

    it('T8: InstantShell على Host أثناء تحميل chunk', () => {
        const host = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/fieldTasks/FieldTasksSheetHost.tsx'),
            'utf8',
        );
        expect(host).toContain('FieldTasksInstantSheetShell');
        expect(host).toContain('field-tasks-sheet-load-error');
        expect(host).toContain('field-tasks-sheet-retry');
    });

    it('T4: طبقات Escape متدرجة — ستارة ثم مدير', () => {
        const escape = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardTasksOverlayEscape.ts'),
            'utf8',
        );
        expect(escape).toContain('onCloseFieldTasksSheet');
        expect(escape).toContain('onCloseTasksManager');
        expect(escape.indexOf('fieldTasksSheetOpen')).toBeLessThan(
            escape.lastIndexOf('showTasksManager'),
        );
    });
});

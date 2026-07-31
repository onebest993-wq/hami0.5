import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('phase-14 intent-warm deferral', () => {
    it('settings hook لا يستورد settingsIntentWarm بشكل متزامن', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardSettings.ts'),
            'utf8',
        );
        expect(src.includes("from '@/app/hooks/lawyerDashboard/settingsIntentWarm'")).toBe(false);
        expect(src).toContain("import('@/app/hooks/lawyerDashboard/settingsIntentWarm')");
    });

    it('fieldTasks hook لا يستورد fieldTasksIntentWarm بشكل متزامن', () => {
        const src = readFileSync(
            join(root, 'src/app/hooks/lawyerDashboard/useLawyerDashboardFieldTasks.ts'),
            'utf8',
        );
        expect(src.includes("from '@/app/hooks/lawyerDashboard/fieldTasksIntentWarm'")).toBe(false);
        expect(src).toContain("import('@/app/hooks/lawyerDashboard/fieldTasksIntentWarm')");
    });
});

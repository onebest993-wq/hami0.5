import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

describe('calendar open gesture snappiness', () => {
    it('يفتح التقويم بعلم html + CSS حرج مثل الملف المهني', () => {
        const openFlow = fs.readFileSync(
            path.join(root, 'src/app/hooks/lawyerDashboard/schedule/scheduleShellOpenFlow.ts'),
            'utf8',
        );
        const criticalCss = fs.readFileSync(
            path.join(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );

        expect(openFlow).toContain('snapScheduleShellOpen');
        expect(openFlow).toContain('scheduleShellReactSync');
        expect(criticalCss).toContain("data-hami-schedule-open='1'");
        expect(criticalCss).toContain('lawyer-dashboard-schedule-surface');
        expect(criticalCss).toContain('lawyer-dashboard-profile-surface');
        expect(criticalCss).toContain('lawyer-profile-back');
    });
});

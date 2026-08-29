import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('home grid entrance', () => {
    it('وحدة الدخول التزيينية محذوفة والشبكة لا تستدعيها', () => {
        expect(existsSync(resolve(root, 'src/app/components/lawyer/dashboard/homeGridEntrance.ts'))).toBe(
            false,
        );
        const grid = readFileSync(
            resolve(root, 'src/app/components/lawyer/dashboard/HomeMainGrid.tsx'),
            'utf8',
        );
        expect(grid).not.toContain('homeGridEntrance');
        expect(grid).not.toContain('scheduleHomeGridEntrance');
        const css = readFileSync(
            resolve(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-critical.css'),
            'utf8',
        );
        const motion = readFileSync(
            resolve(root, 'src/app/components/lawyer/dashboard/lawyerHomeFx-overlayMotion.css'),
            'utf8',
        );
        expect(css).not.toContain('hami-home-slot-enter');
        expect(motion).not.toContain('hami-home-slot-enter');
        const resume = readFileSync(resolve(root, 'src/app/runtime/nativeResumeFastPath.ts'), 'utf8');
        expect(resume).toContain('delete document.documentElement.dataset.hamiHomeEntrance');
    });
});

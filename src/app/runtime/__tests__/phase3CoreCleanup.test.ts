import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CaseOverlays cleanup — بعد الحذف الكامل', () => {
    it('CaseOverlays غير موجود', () => {
        expect(() =>
            readFileSync(
                join(
                    process.cwd(),
                    'src/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCaseOverlays.tsx',
                ),
                'utf8',
            ),
        ).toThrow();
    });

    it('lazyComponents ما زال يصدّر LazyExecutionDashboard (مسار حي عبر loaders)', () => {
        const src = readFileSync(join(process.cwd(), 'src/app/utils/lazyComponents.tsx'), 'utf8');
        expect(src).toMatch(/export const LazyExecutionDashboard\b/);
        expect(src).toContain('loadExecutionDashboardModule');
    });
});

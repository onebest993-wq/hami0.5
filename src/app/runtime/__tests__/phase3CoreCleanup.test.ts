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

    /*
     * كان عنوان هذا الاختبار «مسار حي عبر loaders» ويشترط تصدير `LazyExecutionDashboard`
     * من `lazyComponents`. والقياس كشف أن الوصف غير صحيح: ذلك التصدير لا يستورده أحد.
     * إضبارة التنفيذ تُركَّب من `ExecutionDashboardPortal` بمكوّنٍ مؤجَّل يبنيه بنفسه عبر
     * `createPreloadableLazyComponent` — فالمحور كان يحمل نسخة ثانية لا يمسّها أحد.
     *
     * فالشرط الآن على المسار الحيّ نفسه: البوّابة تُحمّل الوحدة من `loadExecutionDashboardModule`،
     * وتعزل عطلها بحدّ أخطاء حتى لا يُسقط عطلُ الإضبارة التطبيق كلّه.
     */
    it('إضبارة التنفيذ تُحمَّل من مُحمِّلها وتُعزل بحدّ أخطاء', () => {
        const portal = readFileSync(
            join(process.cwd(), 'src/app/components/lawyer/dashboard/ExecutionDashboardPortal.tsx'),
            'utf8',
        );
        expect(portal).toContain('loadExecutionDashboardModule');
        expect(portal).toContain('createPreloadableLazyComponent');
        expect(portal).toContain('<ErrorBoundary');
        expect(portal).toContain('key={file.id}');

        const hub = readFileSync(join(process.cwd(), 'src/app/utils/lazyComponents.tsx'), 'utf8');
        expect(hub).not.toMatch(/export const LazyExecutionDashboard\b/);
    });
});

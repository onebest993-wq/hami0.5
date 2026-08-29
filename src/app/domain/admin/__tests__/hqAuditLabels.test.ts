import { describe, expect, it } from 'vitest';
import { hqAuditActionLabel, hqAuditFactsCaption } from '@/app/domain/admin/hqAuditLabels';

describe('hqAuditLabels', () => {
    it('يترجم تصحيح الاسم ويعرض من/إلى بالعربية', () => {
        expect(hqAuditActionLabel('hq:user.display_name_correct')).toBe('تصحيح الاسم الثلاثي');
        expect(
            hqAuditFactsCaption({
                targetId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                from: 'علي محمد حسن',
                to: 'علي حسن محمد',
            }),
        ).toBe('من «علي محمد حسن» إلى «علي حسن محمد»');
        expect(
            hqAuditFactsCaption({
                from: 'علي محمد حسن',
                to: 'علي حسن محمد',
                kycName: 'علي محمد علي',
            }),
        ).toBe('من «علي محمد حسن» إلى «علي حسن محمد» · طلب التوثيق «علي محمد علي»');
    });

    it('يسقط targetId ولا يمرّر مفاتيح إنجليزية لساعات التجميد', () => {
        expect(hqAuditFactsCaption({ targetId: 'x', durationHours: 24, reason: 'إساءة' })).toBe(
            'ساعات: 24 · سبب: إساءة',
        );
    });
});

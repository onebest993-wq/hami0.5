import { describe, expect, it } from 'vitest';
import { sanitizePinSubtitle } from '../pinDisplayUtils';
import { buildCriminalWorkspacePin, buildLawsuitWorkspacePin } from '../workspacePinBuilders';

describe('workspacePinBuilders', () => {
    it('يبني تثبيت دعوى عندما المعرف رقمي', () => {
        const pin = buildLawsuitWorkspacePin({
            id: 42,
            type: 'lawsuit',
            caseNo: '2026/150',
            parties: [{ name: 'أحمد', isClient: true }],
        });
        expect(pin).not.toBeNull();
        expect(pin?.id).toBe('42');
        expect(pin?.type).toBe('lawsuit');
        expect(pin?.caseNumber).toBe('2026/150');
    });

    it('لا يعرض نصاً عشوائياً كرقم قضية', () => {
        const pin = buildCriminalWorkspacePin({
            id: 'cr-1',
            location: { caseNumber: 'ؤءرءؤر' },
            basics: { stage: 'تحقيق' },
            defendants: [{ name: 'علي' }],
        });
        expect(pin?.caseNumber).toBe('');
    });

    it('لا يعرض اسم موكل عشوائي قصير كسطر فرعي', () => {
        expect(sanitizePinSubtitle('', 'جزائي — مرحلة التحقيق', 'لابالبا')).toBe('');
        expect(sanitizePinSubtitle('', 'دعوى', 'شركة الأفق للتجارة')).toBe('شركة الأفق للتجارة');
    });
});

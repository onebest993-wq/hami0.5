import { describe, expect, it } from 'vitest';
import { buildUrgentCardPresentation } from '../Component_Urgent_Card.presentation';
import type { UrgentCase } from '../Component_Urgent_Card.types';

function sampleCase(overrides: Partial<UrgentCase> = {}): UrgentCase {
    return {
        id: 'u1',
        type: 'urgent_action',
        actionType: 'وضع إشارة عدم التصرف',
        applicantName: 'الطالب',
        party2Name: 'المطلوب',
        court: 'بداءة الكرخ',
        requestNumber: 'فعقفغعفغ',
        requestDate: '2026-08-28',
        judgeName: 'القاضي',
        status: 'safe',
        phase: 'active',
        ...overrides,
    } as UrgentCase;
}

describe('buildUrgentCardPresentation', () => {
    it('does not duplicate request number as a subtitle', () => {
        const view = buildUrgentCardPresentation(sampleCase());
        expect(view).not.toHaveProperty('subtitle');
        expect(view.metaRows.filter((row) => row.label === 'رقم الطلب')).toHaveLength(1);
        expect(view.metaRows.map((row) => row.label)).toEqual([
            'رقم الطلب',
            'المحكمة',
            'تاريخ الطلب',
            'القاضي',
        ]);
        expect(view.parties?.left?.role).toBe('الطالب');
        expect(view.parties?.right?.role).toBe('المطلوب ضده');
    });
});

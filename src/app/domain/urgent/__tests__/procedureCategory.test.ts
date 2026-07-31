import { describe, expect, it } from 'vitest';
import {
    cassationAdvisoryHint,
    resolveProcedureCategory,
} from '../procedureCategory';

describe('procedureCategory', () => {
    it('classifies petition orders types', () => {
        expect(resolveProcedureCategory(null, 'وضع إشارة عدم التصرف')).toBe('petition_orders');
        expect(resolveProcedureCategory(null, 'أمر ولائي آخر (تحديد يدوي)')).toBe('petition_orders');
        expect(resolveProcedureCategory(null, 'الحجز الاحتياطي')).toBe('petition_orders');
        expect(resolveProcedureCategory(null, 'منع السفر')).toBe('petition_orders');
    });

    it('classifies urgent judiciary types', () => {
        expect(resolveProcedureCategory(null, 'الكشف المستعجل وتثبيت الحالة')).toBe('urgent_judiciary');
        expect(resolveProcedureCategory(null, 'سماع شاهد (خطر الفوات)')).toBe('urgent_judiciary');
        expect(resolveProcedureCategory(null, 'استكتاب وإقرار بالسندات')).toBe('urgent_judiciary');
    });

    it('uses stored category when present', () => {
        expect(resolveProcedureCategory('urgent_judiciary', 'وضع إشارة عدم التصرف')).toBe('urgent_judiciary');
    });

    it('returns distinct cassation advisory hints', () => {
        expect(cassationAdvisoryHint('urgent_judiciary')).toContain('مباشراً');
        expect(cassationAdvisoryHint('petition_orders')).toContain('قرار التظلم');
    });
});

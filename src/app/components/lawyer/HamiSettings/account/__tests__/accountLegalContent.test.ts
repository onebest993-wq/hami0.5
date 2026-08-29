import { describe, expect, it } from 'vitest';
import { ACCOUNT_LEGAL_DOCUMENTS } from '@/app/components/lawyer/HamiSettings/account/accountLegalContent';

describe('accountLegalContent', () => {
    it('يتضمن الوثيقة الموحدة بأبوابها الثلاثة دون نبذة منفصلة', () => {
        expect(Object.keys(ACCOUNT_LEGAL_DOCUMENTS)).toEqual(['terms-and-usage']);
        const doc = ACCOUNT_LEGAL_DOCUMENTS['terms-and-usage'];
        expect(doc.sections.length).toBeGreaterThan(10);
        expect(doc.sections.some((s) => s.title.includes('ديباجة'))).toBe(true);
        expect(doc.sections.some((s) => s.title.includes('الشروط والأحكام العامة'))).toBe(true);
        expect(doc.sections.some((s) => s.title.includes('الاستخدام المقبول'))).toBe(true);
        expect(doc.sections.some((s) => s.title.includes('الخصوصية'))).toBe(true);
        expect(doc.sections.some((s) => s.title.includes('التدابير الجزائية'))).toBe(true);
        expect(doc.sections.some((s) => s.title.includes('الامتثال'))).toBe(true);
        expect(doc.sections.some((s) => s.title.includes('نقابة المحامين'))).toBe(false);
        expect(
            doc.sections.some((s) =>
                s.bullets?.some((b) => b.includes('نقابة المحامين العراقيين')),
            ),
        ).toBe(true);
        expect(doc.sections.some((s) => s.title.includes('ما هو حامي'))).toBe(false);
    });
});

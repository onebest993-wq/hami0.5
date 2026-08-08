import { describe, expect, it } from 'vitest';
import {
    readLawsuitStageText,
    readLawsuitStageYmd,
    readTimelineBody,
} from '@/app/spark/coherence/normalize/lawsuitStageFields';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';

describe('lawsuitStageFields', () => {
    it('يقرأ تواريخ المرحلة من حقول اختيارية', () => {
        const stage = {
            id: 's1',
            name: 'البداءة',
            status: 'active',
            createdDate: '2026-03-01',
            court: 'محكمة البداءة',
        } as CaseStage;

        expect(readLawsuitStageYmd(stage, 'filingDate', 'createdDate')).toBe('2026-03-01');
        expect(readLawsuitStageText(stage, 'courtName', 'court')).toBe('محكمة البداءة');
    });

    it('يجمع نص الحدث من الحقول البديلة', () => {
        expect(readTimelineBody({ description: 'ملاحظة السجل' })).toBe('ملاحظة السجل');
        expect(readTimelineBody({ text: 'نص بديل' })).toBe('نص بديل');
    });
});

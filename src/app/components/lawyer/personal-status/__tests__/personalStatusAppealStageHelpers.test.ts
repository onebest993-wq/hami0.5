import { describe, expect, it } from 'vitest';
import {
    filterPersonalStatusAppealMethods,
    isPersonalStatusAppealContext,
    isPersonalStatusCoreStage,
} from '../personalStatusAppealStageHelpers';

describe('personalStatusAppealStageHelpers', () => {
    it('filters appeal methods for personal status', () => {
        expect(filterPersonalStatusAppealMethods(['تمييز', 'استئناف'])).toEqual(['تمييز']);
    });

    it('detects personal status appeal context from file type', () => {
        expect(
            isPersonalStatusAppealContext(undefined, undefined, { selectedType: 'personal' }),
        ).toBe(true);
        expect(isPersonalStatusAppealContext('استئناف', [{ stageName: 'بداءة الدعوى' }])).toBe(false);
        expect(
            isPersonalStatusAppealContext('الاعتراض على الحكم الغيابي', [
                { stageName: 'أحوال شخصية' },
                { stageName: 'الاعتراض على الحكم الغيابي' },
            ]),
        ).toBe(true);
        expect(
            isPersonalStatusAppealContext('الاعتراض على الحكم الغيابي', [
                { stageName: 'بداءة بدرجة أولى' },
                { stageName: 'الاعتراض على الحكم الغيابي' },
            ]),
        ).toBe(false);
    });

    it('classifies core stage vs extraordinary', () => {
        expect(isPersonalStatusCoreStage('الطلاق')).toBe(true);
        expect(isPersonalStatusCoreStage('التمييز')).toBe(false);
    });
});

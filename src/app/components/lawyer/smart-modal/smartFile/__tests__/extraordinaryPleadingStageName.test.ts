import { describe, expect, it } from 'vitest';
import { isAppealStageName } from '../judgmentStageNames';
import {
    qualifyExtraordinaryPleadingStageName,
    extraordinaryPleadingCourtLayerLabel,
} from '../extraordinaryPleadingStageName';
import { resolvePleadingLayer, isBeginningPleadingStageName, isPleadingStageName } from '../pleadingStageClassification';

describe('extraordinaryPleadingStageName', () => {
    it('يقيّد اعتراض الغير وإعادة المحاكمة بطبقة البداءة أو الاستئناف', () => {
        expect(qualifyExtraordinaryPleadingStageName('اعتراض الغير', 'بداءة بدرجة أولى')).toBe(
            'اعتراض الغير (بداءة)',
        );
        expect(qualifyExtraordinaryPleadingStageName('اعتراض الغير', 'الاستئناف')).toBe(
            'اعتراض الغير (استئناف)',
        );
        expect(qualifyExtraordinaryPleadingStageName('إعادة محاكمة', 'بداءة بدرجة أخيرة')).toBe(
            'إعادة المحاكمة (بداءة)',
        );
        expect(qualifyExtraordinaryPleadingStageName('إعادة المحاكمة', 'الاستئناف')).toBe(
            'إعادة المحاكمة (استئناف)',
        );
        expect(qualifyExtraordinaryPleadingStageName('اعتراض على الحكم الغيابي', 'بداءة بدرجة أولى')).toBe(
            'اعتراض على الحكم الغيابي (بداءة)',
        );
        expect(qualifyExtraordinaryPleadingStageName('اعتراض على الحكم الغيابي', 'الاستئناف')).toBe(
            'اعتراض على الحكم الغيابي (بداءة)',
        );
    });

    it('لا يخلط اعتراض الغير (استئناف) مع مرحلة الاستئناف ذاتها', () => {
        expect(isAppealStageName('اعتراض الغير (استئناف)')).toBe(false);
        expect(isAppealStageName('إعادة المحاكمة (استئناف)')).toBe(false);
        expect(isAppealStageName('اعتراض على الحكم الغيابي (استئناف)')).toBe(false);
        expect(isAppealStageName('الاستئناف')).toBe(true);
        expect(resolvePleadingLayer('اعتراض الغير (استئناف)')).toBe('appeal');
        expect(resolvePleadingLayer('اعتراض الغير (بداءة)')).toBe('first_instance');
        expect(isPleadingStageName('اعتراض الغير (بداءة)')).toBe(true);
        expect(isBeginningPleadingStageName('اعتراض الغير (بداءة)')).toBe(false);
        expect(extraordinaryPleadingCourtLayerLabel('الاستئناف')).toBe('استئناف');
        expect(extraordinaryPleadingCourtLayerLabel('بداءة بدرجة أولى')).toBe('بداءة');
    });
});

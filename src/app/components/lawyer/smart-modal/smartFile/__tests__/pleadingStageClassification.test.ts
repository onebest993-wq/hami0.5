import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    isBeginningPleadingStageName,
    isNonPleadingProceduralStageName,
    isPleadingStageName,
    resolveLastPleadingStageIndex,
    resolvePleadingLayer,
} from '../pleadingStageClassification';
import { resolveCassationRemandTarget } from '../appealStageTransition';

describe('pleadingStageClassification', () => {
    it('classifies procedural stages as non-pleading', () => {
        expect(isNonPleadingProceduralStageName('التمييز')).toBe(true);
        expect(isNonPleadingProceduralStageName('تمييز')).toBe(true);
        expect(isNonPleadingProceduralStageName('تصحيح قرار')).toBe(true);
        expect(isPleadingStageName('التمييز')).toBe(false);
        expect(isPleadingStageName('تصحيح قرار')).toBe(false);
    });

    it('classifies pleading stages', () => {
        expect(isPleadingStageName('البداءة')).toBe(true);
        expect(isPleadingStageName('الاستئناف')).toBe(true);
        expect(isPleadingStageName('الاعتراض على الحكم الغيابي')).toBe(true);
        expect(isPleadingStageName('اعتراض الغير')).toBe(true);
        expect(isPleadingStageName('إعادة المحاكمة')).toBe(true);
        expect(isPleadingStageName('أحوال شخصية')).toBe(true);
    });

    it('beginning pleading excludes objection and appeal layers', () => {
        expect(isBeginningPleadingStageName('البداءة')).toBe(true);
        expect(isBeginningPleadingStageName('الاستئناف')).toBe(false);
        expect(isBeginningPleadingStageName('الاعتراض على الحكم الغيابي')).toBe(false);
    });

    it('resolveLastPleadingStageIndex skips cassation and correction', () => {
        const stages = [
            { stageName: 'البداءة' },
            { stageName: 'الاعتراض على الحكم الغيابي' },
            { stageName: 'الاستئناف' },
            { stageName: 'التمييز' },
            { stageName: 'تصحيح قرار' },
        ] as CaseStage[];

        expect(resolveLastPleadingStageIndex(stages)).toBe(2);
        expect(resolveLastPleadingStageIndex(stages, 4)).toBe(2);
        expect(resolvePleadingLayer('الاستئناف')).toBe('appeal');
        expect(resolvePleadingLayer('البداءة')).toBe('first_instance');
    });

    it('cassation remand returns to last pleading not cassation after objection path', () => {
        const stages = [
            { stageName: 'البداءة', status: 'completed' },
            { stageName: 'الاعتراض على الحكم الغيابي', status: 'completed' },
            { stageName: 'الاستئناف', status: 'locked' },
            { stageName: 'التمييز', status: 'active' },
        ] as CaseStage[];

        const target = resolveCassationRemandTarget(stages, 3);
        expect(target.stageName).toBe('الاستئناف');
        expect(target.remandLayer).toBe('appeal');
        expect(target.sourceStageIndex).toBe(2);
    });
});

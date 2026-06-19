import { describe, expect, it } from 'vitest';
import {
    filterPetitionVoidFromJudgmentOptions,
    resolvePetitionVoidMenuLabel,
    shouldShowPetitionVoidMenuAction,
} from '../petitionVoidFlow';

describe('petitionVoidFlow', () => {
    it('labels void action by stage', () => {
        expect(resolvePetitionVoidMenuLabel('البداءة')).toBe('إبطال عريضة الدعوى');
        expect(resolvePetitionVoidMenuLabel('الاستئناف')).toBe('إبطال عريضة الاستئناف');
        expect(resolvePetitionVoidMenuLabel('التمييز')).toBe('إبطال عريضة التمييز');
    });

    it('filters void types from judgment picker', () => {
        const filtered = filterPetitionVoidFromJudgmentOptions([
            { value: 'إجابة الدعوى بالكامل', label: 'a' },
            { value: 'إبطال', label: 'b' },
            { value: 'إبطال عريضة الاستئناف', label: 'c' },
        ]);
        expect(filtered).toHaveLength(1);
        expect(filtered[0]?.value).toBe('إجابة الدعوى بالكامل');
    });

    it('hides menu during active void flow', () => {
        expect(
            shouldShowPetitionVoidMenuAction({
                isPleadingsClosed: true,
                petitionVoidFlow: { status: 'registered', voidLabel: 'x', registeredDate: '2026-01-01' },
            } as import('../../../LawyerShared').CaseStage),
        ).toBe(false);
    });
});

import { describe, expect, it } from 'vitest';
import {
    buildStageTransitionMetadata,
    legacyAppealOutcomeToStageOutcome,
    mergeAppealStageMetadata,
    normalizePartyIdList,
    parseJudgmentFormType,
    resolveStructuredJudgmentForm,
    readAppellantPartyIds,
    readAppelleePartyIds,
    stageOutcomeToLegacyAppealOutcome,
} from '../judgmentStageMetadataTypes';
import {
    isFirstInstanceDegree,
    isJudgmentFormType,
    isStageOutcome,
} from '@/app/components/lawyer/lawyerShared/stageTransitionMetadataTypes';
import { resolveCourtJurisdiction, resolveFirstInstanceDegree } from '../stageJurisdictionResolution';

describe('judgmentStageMetadataTypes', () => {
    it('parseJudgmentFormType يحوّل legacy Arabic', () => {
        expect(parseJudgmentFormType('حضوري')).toBe('HADORI');
        expect(parseJudgmentFormType('غيابي')).toBe('GHAYABI');
        expect(parseJudgmentFormType('HADORI')).toBe('HADORI');
        expect(parseJudgmentFormType('مختلط')).toBe('MIXED');
        expect(parseJudgmentFormType('MIXED')).toBe('MIXED');
        expect(parseJudgmentFormType('بمثابة الحضوري')).toBe('HADORI');
        expect(parseJudgmentFormType('غيابي (تم ترك حق الاعتراض)')).toBe('GHAYABI');
    });

    it('readAppellantPartyIds يفضّل appellantPartyIds ثم initialAppellantPartyIds', () => {
        expect(
            readAppellantPartyIds({
                appellantPartyIds: ['2', '3'],
                initialAppellantPartyIds: [1],
            }),
        ).toEqual(['2', '3']);
        expect(readAppellantPartyIds({ initialAppellantPartyIds: [1, 1, '1'] })).toEqual(['1']);
    });

    it('readAppelleePartyIds يستنتج من allPartyIds', () => {
        expect(
            readAppelleePartyIds(
                { appellantPartyIds: ['1'] },
                [1, 2, 3],
            ),
        ).toEqual(['2', '3']);
    });

    it('buildStageTransitionMetadata ي normaliz e ids', () => {
        const meta = buildStageTransitionMetadata({
            appellantPartyIds: [1, '1', 2],
            appelleePartyIds: [3],
            priorStageOutcome: 'LOSS',
            priorJudgmentForm: 'HADORI',
            priorJudgmentType: 'رد الدعوى كلياً',
        });
        expect(meta.appellantPartyIds).toEqual(['1', '2']);
        expect(meta.appelleePartyIds).toEqual(['3']);
        expect(meta.priorStageOutcome).toBe('LOSS');
    });

    it('mergeAppealStageMetadata يحافظ على legacy', () => {
        const merged = mergeAppealStageMetadata(
            { appealType: 'استئناف', appellant: 'المدعي' },
            {
                appellantPartyIds: ['5'],
                priorStageOutcome: 'WIN',
                priorJudgmentForm: 'GHAYABI',
            },
        );
        expect(merged.initialAppellantPartyIds).toEqual(['5']);
        expect(merged.priorStageOutcome).toBe('WIN');
    });

    it('legacy outcome bridge', () => {
        expect(legacyAppealOutcomeToStageOutcome('win')).toBe('WIN');
        expect(stageOutcomeToLegacyAppealOutcome('PARTIAL')).toBe('partial');
    });

    it('type guards', () => {
        expect(isStageOutcome('WIN')).toBe(true);
        expect(isJudgmentFormType('HADORI')).toBe(true);
        expect(isJudgmentFormType('MIXED')).toBe(true);
        expect(isFirstInstanceDegree('FINAL_DEGREE')).toBe(true);
    });

    it('resolveCourtJurisdiction', () => {
        expect(resolveCourtJurisdiction({ type: 'personal', selectedType: 'personal' })).toBe('PERSONAL_STATUS');
        expect(resolveCourtJurisdiction({ type: 'lawsuit', lawsuitJurisdiction: 'civil' })).toBe('CIVIL');
    });

    it('resolveFirstInstanceDegree من appeal route', () => {
        expect(
            resolveFirstInstanceDegree({
                claimValue: '500000',
                stageName: 'البداءة',
            }),
        ).toBe('FINAL_DEGREE');
        expect(
            resolveFirstInstanceDegree({
                claimValue: '5000000',
                stageName: 'البداءة',
            }),
        ).toBe('FIRST_DEGREE');
    });

    it('normalizePartyIdList ي dedupe', () => {
        expect(normalizePartyIdList([1, '1', 2])).toEqual(['1', '2']);
    });

    it('resolveStructuredJudgmentForm يقرأ الصفات الفردية قبل الملخص', () => {
        expect(
            resolveStructuredJudgmentForm({
                judgmentForm: 'حضوري',
                partyJudgmentDispositions: [
                    { partyId: '2', form: 'حضوري' },
                    { partyId: '3', form: 'غيابي' },
                ],
            }),
        ).toBe('MIXED');
        expect(resolveStructuredJudgmentForm({ judgmentForm: 'مختلط' })).toBe('MIXED');
        expect(
            resolveStructuredJudgmentForm({
                partyJudgmentDispositions: [{ partyId: '2', form: 'بمثابة الحضوري' }],
            }),
        ).toBe('HADORI');
        expect(resolveStructuredJudgmentForm({ judgmentForm: 'غيابي' })).toBe('GHAYABI');
    });
});

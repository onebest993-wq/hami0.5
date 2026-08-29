import { describe, expect, it } from 'vitest';
import type { CaseStage } from '@/app/components/lawyer/LawyerShared';
import {
    buildPersonalStatusChromeStageStripItems,
    filterPersonalStatusAppealMethods,
    hasCivilLawsuitStageHistory,
    isPersonalStatusAppealContext,
    isPersonalStatusStageName,
    isPersonalStatusNoAppealMethod,
    normalizePersonalStatusAppealMethod,
    shouldShowPersonalStatusCassationOutcomePanel,
    shouldShowPersonalStatusCoreStageInChrome,
} from './personalStatusStageDisplay';
import { resolveAllowedOpponentAppealMethods } from '@/app/components/lawyer/smart-modal/smartFile/judgmentTypes';

describe('isPersonalStatusAppealContext', () => {
    const civilStages = [
        { stageName: 'بداءة بدرجة أولى' },
        { stageName: 'الاعتراض على الحكم الغيابي' },
    ];

    it('treats civil objection stage as civil when بداءة exists in history', () => {
        expect(hasCivilLawsuitStageHistory(civilStages)).toBe(true);
        expect(
            isPersonalStatusAppealContext('الاعتراض على الحكم الغيابي', civilStages),
        ).toBe(false);
    });

    it('treats civil objection stage as civil when dossier file is civil lawsuit', () => {
        expect(
            isPersonalStatusAppealContext('الاعتراض على الحكم الغيابي', [], {
                type: 'lawsuit',
                selectedType: 'civil',
            }),
        ).toBe(false);
        expect(isPersonalStatusStageName('الاعتراض على الحكم الغيابي')).toBe(false);
    });

    it('treats shared objection stage as personal when أحوال شخصية exists in history', () => {
        expect(
            isPersonalStatusAppealContext('الاعتراض على الحكم الغيابي', [
                { stageName: 'أحوال شخصية' },
                { stageName: 'الاعتراض على الحكم الغيابي' },
            ]),
        ).toBe(true);
        expect(
            isPersonalStatusAppealContext('اعتراض على الحكم الغيابي', [
                { stageName: 'أحوال شخصية' },
            ]),
        ).toBe(true);
    });

    it('keeps personal-status dossier on cassation-only appeal rules', () => {
        expect(
            isPersonalStatusAppealContext('اعتراض على الحكم الغيابي', [], {
                lawsuitJurisdiction: 'personal',
            }),
        ).toBe(true);
    });

    it('blocks all appeal-method variants containing استئناف', () => {
        expect(isPersonalStatusNoAppealMethod('استئناف')).toBe(true);
        expect(isPersonalStatusNoAppealMethod('استئناف متقابل')).toBe(true);
        expect(filterPersonalStatusAppealMethods(['اعتراض غيابي', 'استئناف', 'تمييز'])).toEqual([
            'اعتراض غيابي',
            'تمييز',
        ]);
        expect(
            normalizePersonalStatusAppealMethod('استئناف', {
                stageName: 'أحوال شخصية',
                file: { lawsuitJurisdiction: 'personal' },
            }),
        ).toBe('تمييز');
    });

    it('resolveAllowedOpponentAppealMethods never returns استئناف for personal dossier', () => {
        const methods = resolveAllowedOpponentAppealMethods({
            judgmentForm: 'حضوري',
            stageName: 'أحوال شخصية',
            stages: [{ stageName: 'أحوال شخصية' }],
            file: { lawsuitJurisdiction: 'personal' },
        });
        expect(methods).not.toContain('استئناف');
        expect(methods).toContain('تمييز');
    });
});

describe('shouldShowPersonalStatusCassationOutcomePanel', () => {
    it('shows on active تمييز stage before outcome', () => {
        expect(
            shouldShowPersonalStatusCassationOutcomePanel({
                stage: { stageName: 'تمييز', status: 'active', finalDecision: null },
                viewingStageIndex: 1,
                activeStageIndex: 1,
            }),
        ).toBe(true);
    });

    it('hides after ratification', () => {
        expect(
            shouldShowPersonalStatusCassationOutcomePanel({
                stage: {
                    stageName: 'تمييز',
                    status: 'completed',
                    finalDecision: 'مصدق (القرار اكتسب الدرجة القطعية)',
                },
                viewingStageIndex: 1,
                activeStageIndex: 1,
            }),
        ).toBe(false);
    });

    it('hides when viewing archived stage', () => {
        expect(
            shouldShowPersonalStatusCassationOutcomePanel({
                stage: { stageName: 'تمييز', status: 'active', finalDecision: null },
                isViewingArchived: true,
                viewingStageIndex: 1,
                activeStageIndex: 1,
            }),
        ).toBe(false);
    });

    it('hides on non-cassation stage', () => {
        expect(
            shouldShowPersonalStatusCassationOutcomePanel({
                stage: { stageName: 'أحوال شخصية', status: 'active', finalDecision: null },
                viewingStageIndex: 0,
                activeStageIndex: 0,
            }),
        ).toBe(false);
    });
});

describe('buildPersonalStatusChromeStageStripItems', () => {
    it('shows أحوال شخصية alongside تمييز in multi-stage journey', () => {
        const stages = [
            { id: '1', stageName: 'أحوال شخصية', status: 'locked' },
            { id: '2', stageName: 'تمييز', status: 'active' },
        ] as CaseStage[];

        expect(shouldShowPersonalStatusCoreStageInChrome(stages)).toBe(true);

        const items = buildPersonalStatusChromeStageStripItems(stages, 1, 1);
        expect(items.map((item) => item.displayName)).toEqual(['أحوال شخصية', 'تمييز']);
    });

    it('hides أحوال شخصية pill on single-stage dossier', () => {
        const stages = [{ id: '1', stageName: 'أحوال شخصية', status: 'active' }] as CaseStage[];
        expect(shouldShowPersonalStatusCoreStageInChrome(stages)).toBe(false);
        const items = buildPersonalStatusChromeStageStripItems(stages, 0, 0);
        expect(items).toHaveLength(0);
    });
});

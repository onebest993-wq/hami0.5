import { describe, expect, it } from 'vitest';
import type { CaseStage } from '../../../LawyerShared';
import {
    resolveOpponentChallengeHopSource,
    resolveRemainingOpponentChallengeFooter,
} from '../opponentRegistrationContext';

const MIXED_LANES = [
    { partyId: '2', disposition: 'حضوري' as const, laneState: 'appeal' as const },
    { partyId: '3', disposition: 'غيابي' as const, laneState: 'pending' as const },
];

const firstInstance = {
    id: 's0',
    name: 'بداءة بدرجة أولى',
    stageName: 'بداءة بدرجة أولى',
    status: 'locked',
    judgmentForm: 'مختلط',
    partyJudgmentDispositions: [
        { partyId: '2', form: 'حضوري' },
        { partyId: '3', form: 'غيابي' },
    ],
    partyChallengeLanes: MIXED_LANES,
    parties: [
        { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
        { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
        { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
    ],
} as CaseStage;

const appeal = {
    id: 's1',
    name: 'الاستئناف',
    stageName: 'الاستئناف',
    status: 'active',
} as CaseStage;

describe('opponentRegistrationContext', () => {
    it('hop الاعتراض من شاشة الاستئناف يعود إلى البداءة', () => {
        const hop = resolveOpponentChallengeHopSource(
            [firstInstance, appeal],
            1,
            'اعتراض على الحكم الغيابي',
        );
        expect(hop.index).toBe(0);
        expect(hop.stage.stageName).toBe('بداءة بدرجة أولى');
    });

    it('يظهر مسار اعتراض الغائب المتبقي بعد استئناف الحاضر', () => {
        const remaining = resolveRemainingOpponentChallengeFooter({
            stages: [firstInstance, appeal],
            currentStageName: 'الاستئناف',
            representedParty: 'المدعي',
        });
        expect(remaining.show).toBe(true);
        expect(remaining.methods).toEqual(['اعتراض غيابي', 'استئناف', 'تمييز']);
        expect(remaining.label).toBe('قام الخصم بالطعن');
    });

    it('يخفي اعتراض الغائب عن محامي المدعى عليه الحاضر', () => {
        const remaining = resolveRemainingOpponentChallengeFooter({
            stages: [
                {
                    ...firstInstance,
                    parties: [
                        { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
                        { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: true },
                        { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
                    ],
                } as CaseStage,
                appeal,
            ],
            currentStageName: 'الاستئناف',
            representedParty: 'المدعى عليه',
        });
        expect(remaining.show).toBe(false);
    });

    it('الأحوال الشخصية: المسارات المتبقية بلا استئناف بعد hop التمييز', () => {
        const psCore = {
            ...firstInstance,
            name: 'أحوال شخصية',
            stageName: 'أحوال شخصية',
        } as CaseStage;
        const تمييز = {
            id: 's1',
            name: 'التمييز',
            stageName: 'التمييز',
            status: 'active',
        } as CaseStage;
        const remaining = resolveRemainingOpponentChallengeFooter({
            stages: [psCore, تمييز],
            currentStageName: 'التمييز',
            representedParty: 'المدعي',
            file: { lawsuitJurisdiction: 'personal' },
        });
        expect(remaining.show).toBe(true);
        expect(remaining.methods).not.toContain('استئناف');
        expect(remaining.methods).toEqual(['اعتراض غيابي', 'تمييز']);
    });
});

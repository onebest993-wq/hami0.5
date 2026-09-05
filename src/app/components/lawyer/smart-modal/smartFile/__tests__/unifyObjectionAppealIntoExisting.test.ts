import { describe, expect, it } from 'vitest';
import type { CaseStage, Party } from '../../../LawyerShared';
import { UNIFIED_APPEALS_TIMELINE_TITLE } from '@/app/domain/lawsuit/objectionAppealConsequence';
import { applyAppealStageTransition } from '../appealStageTransitionApply';
import {
    applyUnifyObjectionAppealIntoExisting,
    canUnifyObjectionAppealIntoExisting,
    findLiveAppealStageIndexForUnify,
} from '../unifyObjectionAppealIntoExisting';
import { shouldSpawnIndependentChallengeDossier } from '@/app/domain/lawsuit/independentChallengeDossier';

const PARTIES: Party[] = [
    {
        id: 1,
        name: 'أحمد',
        role: 'المعترض عليه بالحكم الغيابي (المدعي)',
        isClient: true,
        side: 'left',
    },
    {
        id: 2,
        name: 'سامي',
        role: 'مدعى عليه',
        isClient: false,
        side: 'right',
    },
    {
        id: 3,
        name: 'كريم',
        role: 'المعترض على الحكم الغيابي (المدعى عليه)',
        isClient: false,
        side: 'right',
    },
];

function firstInstance(): CaseStage {
    return {
        id: 's0',
        name: 'بداءة بدرجة أولى',
        stageName: 'بداءة بدرجة أولى',
        status: 'locked',
        parties: PARTIES,
        clientStageOutcome: 'WIN',
    } as CaseStage;
}

function appeal(): CaseStage {
    return {
        id: 's1',
        name: 'الاستئناف',
        stageName: 'الاستئناف',
        status: 'active',
        isSuspended: true,
        caseNo: 'است/10',
        parties: [
            { ...PARTIES[1], role: 'المستأنف (المدعى عليه)', side: 'right' },
            { ...PARTIES[0], role: 'المستأنف عليه (المدعي)', side: 'left' },
            { ...PARTIES[2], role: 'مدعى عليه', side: 'right' },
        ],
        appealMetadata: {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            appellantPartyIds: ['2'],
            appelleePartyIds: ['1', '3'],
            priorStageOutcome: 'LOSS',
        },
        timeline: [],
    } as CaseStage;
}

function objection(): CaseStage {
    return {
        id: 's2',
        name: 'الاعتراض على الحكم الغيابي',
        stageName: 'الاعتراض على الحكم الغيابي',
        status: 'active',
        parties: PARTIES,
        finalDecision: 'تأييد الحكم الغيابي — يحق لموكلك الطعن',
        clientStageOutcome: 'LOSS',
        timeline: [],
    } as CaseStage;
}

describe('unifyObjectionAppealIntoExisting', () => {
    it('التوحيد صريح بعد الاستقلال — hop التلقائي يطلب إضبارة مستقلة', () => {
        const stages = [firstInstance(), appeal(), objection()];
        expect(
            canUnifyObjectionAppealIntoExisting({
                stages,
                sourceStage: objection(),
                appealType: 'استئناف',
            }),
        ).toBe(true);
        expect(findLiveAppealStageIndexForUnify(stages)).toBe(1);
        // سياسة الطعن المستقل: رول استئناف مفتوح + مصدر اعتراض ⇒ spawn لا توحيد تلقائي
        expect(
            shouldSpawnIndependentChallengeDossier({
                stages,
                sourceStage: objection(),
                appealType: 'استئناف',
            }),
        ).toBe(true);

        const hop = applyAppealStageTransition(stages, 2, stages[2]!, {
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-09-02',
            newCaseNumber: 'است/88',
            includedAppellantPartyIds: [3],
            includedOpponentPartyIds: [1],
            priorStageOutcome: 'LOSS',
        });
        expect(hop.independentRequired).toBe(true);
        expect(hop.updatedStages).toHaveLength(3);

        // التوحيد يبقى مساراً صريحاً (زر لاحق) وليس hop تلقائياً
        const result = applyUnifyObjectionAppealIntoExisting({
            stages,
            sourceIndex: 2,
            sourceStage: stages[2]!,
            appealType: 'استئناف',
            appellant: 'المدعى عليه',
            filingDate: '2026-09-02',
            newCaseNumber: 'است/88',
            includedAppellantPartyIds: [3],
            includedOpponentPartyIds: [1],
        });

        expect(result).not.toBeNull();
        expect(result!.updatedStages).toHaveLength(3);
        expect(result!.newActiveIndex).toBe(1);
        const unified = result!.updatedStages[1]!;
        expect(unified.stageName).toBe('الاستئناف');
        expect(unified.caseNo).toBe('است/10');
        expect(unified.timeline?.[0]?.title).toBe(UNIFIED_APPEALS_TIMELINE_TITLE);
        expect(unified.appealMetadata?.appellantPartyIds).toEqual(expect.arrayContaining(['2', '3']));
        expect(result!.updatedStages[2]?.status).toBe('locked');
        expect(unified.parties?.some((party) => party.id === 3 && String(party.role).includes('المستأنف'))).toBe(
            true,
        );
    });

    it('لا يوحّد التمييز ولا يفتح اعتراضاً فوق استئناف قائم', () => {
        const stages = [firstInstance(), appeal(), objection()];
        expect(
            canUnifyObjectionAppealIntoExisting({
                stages,
                sourceStage: objection(),
                appealType: 'تمييز',
            }),
        ).toBe(false);
        const cassation = applyAppealStageTransition(stages, 2, stages[2]!, {
            appealType: 'تمييز',
            appellant: 'المدعى عليه',
            filingDate: '2026-09-02',
            newCaseNumber: 'ت/1',
            includedAppellantPartyIds: [3],
            priorStageOutcome: 'LOSS',
        });
        expect(cassation.independentRequired).toBeFalsy();
        expect(cassation.updatedStages.length).toBeGreaterThan(3);
        expect(String(cassation.updatedStages[cassation.newActiveIndex]?.stageName ?? '')).toContain(
            'تمييز',
        );
    });
});

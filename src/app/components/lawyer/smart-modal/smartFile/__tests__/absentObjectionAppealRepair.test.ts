import { describe, expect, it } from 'vitest';
import type { CaseStage, Party } from '../../../LawyerShared';
import {
    inferAbsentObjectionOutcomeLoser,
    isAbsentObjectionAppealFlipCorrupted,
    repairAbsentObjectionAppealStages,
    repairSingleAbsentObjectionAppealStage,
    resolveCorrectAppellantLegalSideForAbsentObjectionAppeal,
} from '../absentObjectionAppealRepair';

const objectionParties: Party[] = [
    {
        id: 1,
        name: 'موكل',
        role: 'المعترض عليه بالحكم الغيابي (المدعي)',
        isClient: true,
        side: 'left',
    },
    {
        id: 2,
        name: 'خصم',
        role: 'المعترض على الحكم الغيابي (المدعى عليه)',
        isClient: false,
        side: 'right',
    },
];

const objectionStageUphold = {
    id: 'obj',
    stageName: 'الاعتراض على الحكم الغيابي',
    status: 'locked',
    isPleadingsClosed: true,
    finalDecision: 'تأييد الحكم الغيابي — بانتظار طعن المعترض',
    parties: objectionParties,
} as CaseStage;

function corruptedAppealStage(): CaseStage {
    return {
        id: 'appeal',
        stageName: 'الاستئناف',
        status: 'active',
        parties: [
            {
                id: 1,
                name: 'موكل',
                role: 'المستأنف (المدعي)',
                isClient: true,
                side: 'right',
            },
            {
                id: 2,
                name: 'خصم',
                role: 'المستأنف عليه (المدعى عليه)',
                isClient: false,
                side: 'left',
            },
        ],
        appealMetadata: {
            appealType: 'استئناف',
            appellant: 'المدعي',
            filingDate: '2026-03-01',
            previousStage: 'الاعتراض على الحكم الغيابي',
            initialAppellantPartyIds: [2],
        },
    } as CaseStage;
}

describe('absentObjectionAppealRepair', () => {
    it('infers objector as loser on uphold', () => {
        expect(inferAbsentObjectionOutcomeLoser(objectionStageUphold)).toBe('objector');
    });

    it('detects corrupted flip when winner is marked المستأنف', () => {
        const appeal = corruptedAppealStage();
        expect(isAbsentObjectionAppealFlipCorrupted(objectionStageUphold, appeal)).toBe(true);
    });

    it('resolves correct appellant legal side as original defendant (objector)', () => {
        const appeal = corruptedAppealStage();
        expect(
            resolveCorrectAppellantLegalSideForAbsentObjectionAppeal(objectionStageUphold, appeal),
        ).toBe('المدعى عليه');
    });

    it('repairs appeal stage: client becomes المستأنف عليه, opponent المستأنف', () => {
        const appeal = corruptedAppealStage();
        const repaired = repairSingleAbsentObjectionAppealStage(objectionStageUphold, appeal);

        expect(repaired.appealMetadata?.appellant).toBe('المدعى عليه');
        const client = repaired.parties?.find((p) => p.id === 1);
        const opponent = repaired.parties?.find((p) => p.id === 2);
        expect(client?.role).toContain('المستأنف عليه');
        expect(client?.side).toBe('left');
        expect(opponent?.role).toContain('المستأنف');
        expect(opponent?.side).toBe('right');
        expect(client?.isClient).toBe(true);
    });

    it('repairs stages array on load', () => {
        const stages = [objectionStageUphold, corruptedAppealStage()];
        const repaired = repairAbsentObjectionAppealStages(stages);
        const appeal = repaired[1]!;
        expect(appeal.parties?.find((p) => p.id === 1)?.role).toContain('المستأنف عليه');
        expect(appeal.appealMetadata?.appellant).toBe('المدعى عليه');
    });

    it('infers objected as loser on full modify', () => {
        const modifyStage = {
            ...objectionStageUphold,
            finalDecision: 'تعديل الحكم الغيابي — بانتظار طعن المدعي الأصلي',
        } as CaseStage;
        expect(inferAbsentObjectionOutcomeLoser(modifyStage)).toBe('objected');
    });

    it('does not repair when flip is already correct', () => {
        const appeal = corruptedAppealStage();
        const correct = repairSingleAbsentObjectionAppealStage(objectionStageUphold, appeal);
        expect(isAbsentObjectionAppealFlipCorrupted(objectionStageUphold, correct)).toBe(false);
        expect(repairAbsentObjectionAppealStages([objectionStageUphold, correct])[1]).toEqual(correct);
    });
});

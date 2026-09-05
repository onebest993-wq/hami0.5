import { describe, expect, it } from 'vitest';
import {
    filterAppellantPartiesByChallengeMethod,
    isGhayabiObjectionAppealType,
} from '../challengeAppellantEligibility';

const DEFENDANTS = [
    { id: 2, name: 'سامي', isClient: true },
    { id: 3, name: 'كريم', isClient: false },
    { id: 4, name: 'نادر', isClient: false },
];

const MIXED = [
    { partyId: '2', form: 'حضوري' as const },
    { partyId: '3', form: 'غيابي' as const },
    { partyId: '4', form: 'غيابي' as const },
];

describe('challengeAppellantEligibility', () => {
    it('يميّز اعتراض الحكم الغيابي عن اعتراض الغير', () => {
        expect(isGhayabiObjectionAppealType('اعتراض على الحكم الغيابي')).toBe(true);
        expect(isGhayabiObjectionAppealType('اعتراض غيابي')).toBe(true);
        expect(isGhayabiObjectionAppealType('اعتراض الغير')).toBe(false);
        expect(isGhayabiObjectionAppealType('استئناف')).toBe(false);
        expect(isGhayabiObjectionAppealType('تمييز')).toBe(false);
    });

    it('اعتراض الحكم الغيابي يُبقي الغائبين فقط — لا الحاضر', () => {
        expect(
            filterAppellantPartiesByChallengeMethod(DEFENDANTS, {
                appealType: 'اعتراض على الحكم الغيابي',
                dispositions: MIXED,
            }).map((p) => p.id),
        ).toEqual([3, 4]);
    });

    it('الاستئناف المختلط يُبقي الحاضر والغائب الملزَم — الغائب يختار استئنافاً أو اعتراضاً', () => {
        expect(
            filterAppellantPartiesByChallengeMethod(DEFENDANTS, {
                appealType: 'استئناف',
                dispositions: MIXED,
            }).map((p) => p.id),
        ).toEqual([2, 3, 4]);
    });

    it('الاستئناف المختلط يُبقي الاختصامي المستقل مع الحاضرين والغائبين الملزَمين', () => {
        const withInterpleader = [
            ...DEFENDANTS,
            { id: 5, name: 'اختصام', role: 'شخص ثالث (اختصامي)', isClient: false },
        ];
        expect(
            filterAppellantPartiesByChallengeMethod(withInterpleader, {
                appealType: 'استئناف',
                dispositions: MIXED,
            }).map((p) => p.id),
        ).toEqual([2, 3, 4, 5]);
        expect(
            filterAppellantPartiesByChallengeMethod(withInterpleader, {
                appealType: 'اعتراض على الحكم الغيابي',
                dispositions: MIXED,
            }).map((p) => p.id),
        ).toEqual([3, 4]);
    });

    it('استئناف الحكم المختلط يُظهر الغائبين أيضاً', () => {
        const ghayabiClient = [
            { id: 2, isClient: false },
            { id: 3, isClient: true },
            { id: 4, isClient: false },
        ];
        expect(
            filterAppellantPartiesByChallengeMethod(ghayabiClient, {
                appealType: 'استئناف',
                dispositions: MIXED,
            }).map((p) => p.id),
        ).toEqual([2, 3, 4]);
    });

    it('تسجيل خصم غيابي بالكامل على الاستئناف يُبقي الغائبين (ترك الاعتراض)', () => {
        const opponents = [
            { id: 2, isClient: false },
            { id: 3, isClient: false },
        ];
        expect(
            filterAppellantPartiesByChallengeMethod(opponents, {
                appealType: 'استئناف',
                dispositions: [
                    { partyId: '2', form: 'غيابي' },
                    { partyId: '3', form: 'غيابي' },
                ],
            }).map((p) => p.id),
        ).toEqual([2, 3]);
    });

    it('بلا dispositions لا يُصفّي', () => {
        expect(
            filterAppellantPartiesByChallengeMethod(DEFENDANTS, {
                appealType: 'اعتراض على الحكم الغيابي',
            }),
        ).toEqual(DEFENDANTS);
    });

    it('حكم غيابي موحّد بلا تفريد يُبقي المدعى عليهم في الاعتراض', () => {
        expect(
            filterAppellantPartiesByChallengeMethod(DEFENDANTS, {
                appealType: 'اعتراض على الحكم الغيابي',
                scalarForm: 'غيابي',
            }).map((p) => p.id),
        ).toEqual([2, 3, 4]);
    });

    it('من مرحلة الاعتراض لا يُصفّي المستأنف بصفة حضور البداءة', () => {
        const objectionParties = [
            {
                id: 1,
                role: 'المعترض عليه بالحكم الغيابي (المدعي)',
            },
            {
                id: 4,
                role: 'المعترض على الحكم الغيابي (المدعى عليه)',
            },
        ];
        expect(
            filterAppellantPartiesByChallengeMethod(objectionParties, {
                appealType: 'استئناف',
                dispositions: MIXED,
            }).map((p) => p.id),
        ).toEqual([1, 4]);
    });

    it('من استُهلك اعتراضه لا يبقى في قائمة الاعتراض ولا في الاستئناف', () => {
        const lanes = [
            { partyId: '2', disposition: 'حضوري', laneState: 'open' },
            { partyId: '3', disposition: 'غيابي', laneState: 'objection' },
            { partyId: '4', disposition: 'غيابي', laneState: 'open' },
        ];
        expect(
            filterAppellantPartiesByChallengeMethod(DEFENDANTS, {
                appealType: 'اعتراض على الحكم الغيابي',
                dispositions: MIXED,
                lanes,
            }).map((p) => p.id),
        ).toEqual([4]);
        expect(
            filterAppellantPartiesByChallengeMethod(DEFENDANTS, {
                appealType: 'استئناف',
                dispositions: MIXED,
                lanes,
            }).map((p) => p.id),
        ).toEqual([2, 4]);
    });
});

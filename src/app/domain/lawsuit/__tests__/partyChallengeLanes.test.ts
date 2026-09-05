import { describe, expect, it } from 'vitest';
import {
    JUDGMENT_FORM_DEEMED_HADARI,
    clientUsesGhayabiChallengeActions,
    resolveClientDefendantJudgmentForm,
    summarizePartyJudgmentForm,
    toLegacyLastJudgmentType,
} from '../partyJudgmentDisposition';
import {
    LANE_STATE_LAPSED_EXECUTABLE,
    LANE_STATE_OBJECTION,
    LANE_STATE_PENDING,
    applySeverableLaneLapses,
    attachPartyChallengeLanes,
    computeLaneAppealDeadlineFromJudgment,
    computeLaneCassationDeadlineFromJudgment,
    computeLaneCassationDeadlineFromService,
    computeLaneObjectionDeadline,
    hasRegisteredObjectionLane,
    hasUnservedGhayabiLane,
    isGhayabiJoinableLane,
    listUnservedGhayabiNoticeOptions,
    listPartyChallengeLaneRadarRows,
    markLaneServed,
    markLanesState,
    mergePartyChallengeLanes,
    missingCompulsoryJoinderIds,
    resolveAbsentObjectionFlipSelection,
    resolveGhayabiObjectorPartyIds,
} from '../partyChallengeLanes';

const PARTIES = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
    { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
    { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
];

const MIXED = [
    { partyId: '2', form: 'حضوري' as const },
    { partyId: '3', form: 'غيابي' as const },
];

describe('partyChallengeLanes', () => {
    it('يبذر بطاقة لكل مدعى عليه مع مهلة استئناف للحاضر دون تبليغ للغائب', () => {
        const lanes = mergePartyChallengeLanes({
            parties: PARTIES,
            dispositions: MIXED,
            judgmentDate: '2026-08-04',
        });
        expect(lanes).toHaveLength(2);
        expect(lanes.find((lane) => lane.partyId === '2')).toMatchObject({
            disposition: 'حضوري',
            laneState: LANE_STATE_PENDING,
            appealDeadline: computeLaneAppealDeadlineFromJudgment('2026-08-04'),
            cassationDeadline: computeLaneCassationDeadlineFromJudgment('2026-08-04'),
            servedAt: null,
        });
        expect(lanes.find((lane) => lane.partyId === '3')).toMatchObject({
            disposition: 'غيابي',
            servedAt: null,
            objectionDeadline: null,
            appealDeadline: null,
            cassationDeadline: null,
        });
        expect(hasUnservedGhayabiLane(lanes)).toBe(true);
        expect(hasRegisteredObjectionLane(lanes)).toBe(false);
    });

    it('يسجّل التبليغ لمدعى عليه غائب واحد ويولّد مهلته المستقلة', () => {
        const seeded = mergePartyChallengeLanes({
            parties: PARTIES,
            dispositions: MIXED,
            judgmentDate: '2026-08-04',
        });
        const served = markLaneServed(seeded, '3', '2026-08-20');
        const ghayabi = served.find((lane) => lane.partyId === '3');
        const present = served.find((lane) => lane.partyId === '2');
        expect(ghayabi?.servedAt).toBe('2026-08-20');
        expect(ghayabi?.objectionDeadline).toBe(computeLaneObjectionDeadline('2026-08-20'));
        expect(ghayabi?.cassationDeadline).toBe(computeLaneCassationDeadlineFromService('2026-08-20'));
        expect(present?.servedAt).toBeNull();
        expect(listUnservedGhayabiNoticeOptions({ parties: PARTIES, lanes: served })).toEqual([]);
    });

    it('يبقي الغائب غير المبلَّغ في قائمة التبليغ بعد تبليغ شريكه', () => {
        const lanes = mergePartyChallengeLanes({
            parties: PARTIES,
            dispositions: [
                { partyId: '2', form: 'غيابي' },
                { partyId: '3', form: 'غيابي' },
            ],
            judgmentDate: '2026-08-04',
        });
        const served = markLaneServed(lanes, '2', '2026-08-20');
        expect(listUnservedGhayabiNoticeOptions({ parties: PARTIES, lanes: served })).toEqual([
            { partyId: '3', name: 'كريم' },
        ]);
        expect(hasUnservedGhayabiLane(served)).toBe(true);
    });

    it('يبذر الغائبين من صفة الحكم الغيابي إذا لم تُحفظ صفات فردية', () => {
        expect(
            listUnservedGhayabiNoticeOptions({
                parties: PARTIES,
                judgmentForm: 'غيابي',
            }).map((row) => row.partyId),
        ).toEqual(['2', '3']);
        const lanes = mergePartyChallengeLanes({
            parties: PARTIES,
            judgmentForm: 'غيابي',
            judgmentDate: '2026-08-04',
        });
        expect(lanes).toHaveLength(2);
        expect(lanes.every((lane) => lane.disposition === 'غيابي' && !lane.servedAt)).toBe(true);
        expect(hasUnservedGhayabiLane(lanes)).toBe(true);
    });

    it('يسم فوات المدة LAPSED_EXECUTABLE عند التجزئة فقط بعد انقضاء مهلة التمييز أيضاً', () => {
        const lanes = mergePartyChallengeLanes({
            parties: PARTIES,
            dispositions: MIXED,
            judgmentDate: '2026-08-04',
        });
        const served = markLaneServed(lanes, '3', '2026-08-04');
        expect(computeLaneCassationDeadlineFromService('2026-08-04')).toBe('2026-09-04');
        const stillOpen = applySeverableLaneLapses(served, 'severable', '2026-09-01');
        expect(stillOpen.find((lane) => lane.partyId === '3')?.laneState).toBe(LANE_STATE_PENDING);
        expect(stillOpen.find((lane) => lane.partyId === '2')?.laneState).toBe(LANE_STATE_PENDING);
        const severable = applySeverableLaneLapses(served, 'severable', '2026-09-10');
        expect(severable.find((lane) => lane.partyId === '3')?.laneState).toBe(
            LANE_STATE_LAPSED_EXECUTABLE,
        );
        expect(severable.find((lane) => lane.partyId === '2')?.laneState).toBe(
            LANE_STATE_LAPSED_EXECUTABLE,
        );
        const indivisible = applySeverableLaneLapses(served, 'indivisible', '2026-09-10');
        expect(indivisible.find((lane) => lane.partyId === '3')?.laneState).toBe('lapsed');
        expect(indivisible.find((lane) => lane.partyId === '3')?.laneState).not.toBe(
            LANE_STATE_LAPSED_EXECUTABLE,
        );
    });

    it('يعيد بطاقة قديمة من LAPSED_EXECUTABLE إلى pending إذا بُذرت مهلة تمييز ما زالت مفتوحة', () => {
        const merged = mergePartyChallengeLanes({
            parties: PARTIES,
            dispositions: MIXED,
            existing: [
                {
                    partyId: '2',
                    disposition: 'حضوري',
                    laneState: LANE_STATE_LAPSED_EXECUTABLE,
                    appealDeadline: '2026-08-20',
                },
                {
                    partyId: '3',
                    disposition: 'غيابي',
                    laneState: LANE_STATE_PENDING,
                    servedAt: null,
                },
            ],
            judgmentDate: '2026-08-04',
            integrity: 'severable',
            today: '2026-09-01',
        });
        expect(merged.find((lane) => lane.partyId === '2')).toMatchObject({
            laneState: LANE_STATE_PENDING,
            cassationDeadline: computeLaneCassationDeadlineFromJudgment('2026-08-04'),
        });
    });

    it('يقصر المعترض على الغائب المختار ولا يقلب الحاضرين', () => {
        expect(resolveGhayabiObjectorPartyIds({
            parties: PARTIES,
            dispositions: MIXED,
            preferClient: true,
        })).toEqual(['3']);
        expect(resolveGhayabiObjectorPartyIds({
            parties: [
                { id: 1, name: 'أحمد', role: 'مدعي', isClient: false },
                { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: true },
                { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
            ],
            dispositions: MIXED,
            preferClient: true,
        })).toEqual([]);
        expect(resolveGhayabiObjectorPartyIds({
            parties: PARTIES,
            dispositions: [
                { partyId: '2', form: 'غيابي' },
                { partyId: '3', form: 'غيابي' },
            ],
        })).toEqual([]);
        expect(resolveGhayabiObjectorPartyIds({
            parties: PARTIES,
            dispositions: [{ partyId: '3', form: 'غيابي' }],
        })).toEqual(['3']);
        expect(resolveAbsentObjectionFlipSelection(['3'])).toEqual({
            includedAppellantPartyIds: ['3'],
        });
        const after = markLanesState(
            mergePartyChallengeLanes({ parties: PARTIES, dispositions: MIXED, judgmentDate: '2026-08-04' }),
            ['3'],
            LANE_STATE_OBJECTION,
        );
        expect(hasRegisteredObjectionLane(after)).toBe(true);
        expect(after.find((lane) => lane.partyId === '2')?.laneState).toBe(LANE_STATE_PENDING);
    });

    it('يلزم اختصام كافة المحكوم لهم في النزاع غير القابل للتجزئة', () => {
        expect(missingCompulsoryJoinderIds(['1', '10'], ['1'])).toEqual(['10']);
        expect(missingCompulsoryJoinderIds(['1', '10'], ['1', '10'])).toEqual([]);
    });

    it('يحفظ بمثابة الحضوري في البطاقة ويلخّصه حضورياً', () => {
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: JUDGMENT_FORM_DEEMED_HADARI },
                { partyId: '3', form: JUDGMENT_FORM_DEEMED_HADARI },
            ]),
        ).toBe('حضوري');
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: JUDGMENT_FORM_DEEMED_HADARI },
                { partyId: '3', form: 'غيابي' },
            ]),
        ).toBe('مختلط');
        expect(toLegacyLastJudgmentType(JUDGMENT_FORM_DEEMED_HADARI)).toBe('حضوري');
        expect(
            resolveClientDefendantJudgmentForm(PARTIES, [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: JUDGMENT_FORM_DEEMED_HADARI },
            ]),
        ).toBe(JUDGMENT_FORM_DEEMED_HADARI);
        expect(clientUsesGhayabiChallengeActions('المدعى عليه', JUDGMENT_FORM_DEEMED_HADARI)).toBe(
            false,
        );
        expect(clientUsesGhayabiChallengeActions('المدعى عليه', 'غيابي')).toBe(true);
        expect(clientUsesGhayabiChallengeActions('المدعي', 'غيابي')).toBe(false);

        const stamped = attachPartyChallengeLanes(
            {
                parties: PARTIES,
                partyJudgmentDispositions: [
                    { partyId: '2', form: JUDGMENT_FORM_DEEMED_HADARI },
                    { partyId: '3', form: 'غيابي' },
                ],
                decisionDate: '2026-08-04',
                disputeIntegrity: 'severable' as const,
            },
        );
        expect(stamped.partyChallengeLanes?.find((lane) => lane.partyId === '2')?.disposition).toBe(
            JUDGMENT_FORM_DEEMED_HADARI,
        );
    });

    it('يبني صفوف رادار البطاقات بأسماء الأطراف وحالة المهلة', () => {
        const rows = listPartyChallengeLaneRadarRows({
            parties: PARTIES,
            dispositions: MIXED,
            judgmentDate: '2026-08-04',
            today: '2026-08-10',
        });
        expect(rows).toHaveLength(2);
        expect(rows.find((row) => row.partyId === '2')?.summary).toContain('استئناف حتى');
        expect(rows.find((row) => row.partyId === '3')?.summary).toBe('بانتظار التبليغ');
        expect(rows.find((row) => row.partyId === '3')?.name).toBe('كريم');
    });

    it('يلخّص قيد الاعتراض والتنازل والسقوط في رادار البطاقة', () => {
        const rows = listPartyChallengeLaneRadarRows({
            parties: PARTIES,
            lanes: [
                { partyId: '2', disposition: 'حضوري', laneState: 'appeal' },
                { partyId: '3', disposition: 'غيابي', laneState: 'objection' },
            ],
        });
        expect(rows.find((row) => row.partyId === '3')?.summary).toBe('قيد الاعتراض الغيابي');
        expect(
            listPartyChallengeLaneRadarRows({
                parties: PARTIES,
                lanes: [
                    { partyId: '3', disposition: 'غيابي', laneState: 'appeal' },
                ],
            }).find((row) => row.partyId === '3')?.summary,
        ).toBe('تنازل عن الاعتراض وطعن استئنافاً');
        expect(
            listPartyChallengeLaneRadarRows({
                parties: PARTIES,
                lanes: [
                    { partyId: '3', disposition: 'غيابي', laneState: 'lapsed' },
                ],
            }).find((row) => row.partyId === '3')?.summary,
        ).toBe('سقوط الحق بالطعن');
    });

    it('يعتبر الغائب المبلَّغ ضمن مهلة العشرة أيام قابلاً للضم', () => {
        const served = markLaneServed(
            mergePartyChallengeLanes({
                parties: PARTIES,
                dispositions: [
                    { partyId: '2', form: 'غيابي' },
                    { partyId: '3', form: 'غيابي' },
                ],
                judgmentDate: '2026-08-01',
            }),
            '3',
            '2026-08-10',
        );
        const karim = served.find((lane) => lane.partyId === '3')!;
        const sami = served.find((lane) => lane.partyId === '2')!;
        expect(isGhayabiJoinableLane(karim, '2026-08-15')).toBe(true);
        expect(isGhayabiJoinableLane(karim, '2026-08-21')).toBe(false);
        expect(isGhayabiJoinableLane(sami, '2026-08-15')).toBe(false);
        expect(isGhayabiJoinableLane(
            { ...karim, laneState: LANE_STATE_OBJECTION },
            '2026-08-15',
        )).toBe(false);
    });
});

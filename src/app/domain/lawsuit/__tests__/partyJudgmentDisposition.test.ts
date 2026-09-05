import { describe, expect, it } from 'vitest';
import {
    alignPartyJudgmentDispositions,
    clientDefendantHasGhayabiDisposition,
    coerceJudgmentTypeForReleasedOperatives,
    hasAnyReleasedDisposition,
    resolveJudgmentTypeFromPartyOperatives,
    clientDefendantEligibleForGhayabiObjection,
    judgmentFormHasGhayabi,
    listJudgmentDispositionDefendants,
    normalizePartyJudgmentDispositions,
    resolveJudgmentPresenceWindows,
    shouldPersistPartyJudgmentStamp,
    stampPartyJudgmentOnStage,
    suggestDisputeIntegrity,
    summarizePartyJudgmentForm,
    toLegacyLastJudgmentType,
    issuedJudgmentPresenceForm,
    isDisputeIndivisible,
    isMixedJudgmentForm,
    formatPartyJudgmentPresenceSummary,
    formatPartyJudgmentOutcomeSummary,
} from '../partyJudgmentDisposition';

describe('partyJudgmentDisposition', () => {
    it('يلخّص الكل حضوري / الكل غيابي / المختلط دون ادعاء شكل موحّد', () => {
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'حضوري' },
            ]),
        ).toBe('حضوري');
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: 'غيابي' },
                { partyId: '3', form: 'غيابي' },
            ]),
        ).toBe('غيابي');
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
            ]),
        ).toBe('مختلط');
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: 'بمثابة الحضوري' },
                { partyId: '3', form: 'غيابي' },
            ]),
        ).toBe('مختلط');
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: 'بمثابة الحضوري' },
                { partyId: '3', form: 'بمثابة الحضوري' },
            ]),
        ).toBe('حضوري');
        expect(toLegacyLastJudgmentType('مختلط')).toBeUndefined();
        expect(toLegacyLastJudgmentType('غيابي')).toBe('غيابي');
        expect(toLegacyLastJudgmentType('بمثابة الحضوري')).toBe('حضوري');
        expect(issuedJudgmentPresenceForm('بمثابة الحضوري')).toBe('بمثابة الحضوري');
        expect(issuedJudgmentPresenceForm('غيابي')).toBe('غيابي');
    });

    it('يحافظ على الملفات القديمة بلا dispositions: غيابي يبقى غيابي', () => {
        expect(summarizePartyJudgmentForm([], 'غيابي')).toBe('غيابي');
        expect(judgmentFormHasGhayabi('غيابي', undefined, undefined)).toBe(true);
        expect(judgmentFormHasGhayabi('حضوري', undefined, undefined)).toBe(false);
        expect(judgmentFormHasGhayabi('مختلط', undefined, undefined)).toBe(true);
        expect(
            judgmentFormHasGhayabi('مختلط', undefined, [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
            ]),
        ).toBe(true);
        expect(
            judgmentFormHasGhayabi('مختلط', undefined, [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'حضوري' },
            ]),
        ).toBe(false);
    });

    it('يسقط الصفوف المعطوبة ويُبقي أول شكل لكل طرف', () => {
        expect(
            normalizePartyJudgmentDispositions([
                { partyId: '2', form: 'غيابي' },
                { partyId: '2', form: 'حضوري' },
                { partyId: '', form: 'غيابي' },
                { form: 'غيابي' },
                { partyId: '3', form: 'باطل' },
            ]),
        ).toEqual([{ partyId: '2', form: 'غيابي', operative: 'bound' }]);
    });

    it('يعدّ المدعى عليهم دون المدعي ودون الاختصامي المستقل', () => {
        const listed = listJudgmentDispositionDefendants([
            { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
            { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
            { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: true },
            { id: 4, name: 'زيد', role: 'شخص ثالث اختصامي' },
            { id: 5, name: 'هناء', role: 'شخص ثالث انضمامي — جانب المدعى عليه' },
        ]);
        expect(listed.map((p) => p.id)).toEqual([2, 3, 5]);
    });

    it('يعرض اعتراض الغيابي للموكل الغائب فقط في الحكم المختلط', () => {
        const parties = [
            { id: 1, role: 'مدعي', isClient: false },
            { id: 2, role: 'مدعى عليه', isClient: true },
            { id: 3, role: 'مدعى عليه', isClient: false },
        ];
        const mixed = [
            { partyId: '2', form: 'حضوري' as const },
            { partyId: '3', form: 'غيابي' as const },
        ];
        expect(clientDefendantHasGhayabiDisposition(parties, mixed)).toBe(false);
        expect(
            clientDefendantHasGhayabiDisposition(parties, [
                { partyId: '2', form: 'غيابي' },
                { partyId: '3', form: 'حضوري' },
            ]),
        ).toBe(true);
        expect(clientDefendantHasGhayabiDisposition(parties, [])).toBe(false);
    });

    it('يقترح عدم التجزئة دائماً', () => {
        expect(suggestDisputeIntegrity('إزالة شيوع')).toBe('indivisible');
        expect(suggestDisputeIntegrity('تخلية مأجور')).toBe('indivisible');
        expect(suggestDisputeIntegrity('مطالبة بدين')).toBe('indivisible');
        expect(isDisputeIndivisible('indivisible')).toBe(true);
        expect(isDisputeIndivisible('severable')).toBe(false);
        expect(isDisputeIndivisible(undefined)).toBe(false);
        expect(isMixedJudgmentForm('مختلط')).toBe(true);
        expect(isMixedJudgmentForm('غيابي')).toBe(false);
    });

    it('يلخّص صفة كل مدعى عليه بلا كلمة مختلط', () => {
        expect(
            formatPartyJudgmentPresenceSummary(
                [
                    { id: 2, name: 'سامي' },
                    { id: 3, name: 'كريم' },
                ],
                [
                    { partyId: '2', form: 'حضوري' },
                    { partyId: '3', form: 'غيابي' },
                ],
            ),
        ).toBe('سامي حضوري — كريم غيابي');
    });

    it('يلخّص نتيجة كل خصم: صفة + إلزام/رد', () => {
        expect(
            formatPartyJudgmentOutcomeSummary(
                [
                    { id: 2, name: 'سامي' },
                    { id: 3, name: 'كريم' },
                ],
                [
                    { partyId: '2', form: 'حضوري', operative: 'bound' },
                    { partyId: '3', form: 'غيابي', operative: 'released' },
                ],
            ),
        ).toBe('سامي — حضوري — إلزام\nكريم — غيابي — رد');
    });

    it('يختم المرحلة بالملخص المختلط دون lastJudgmentType موحّد', () => {
        const stamped = stampPartyJudgmentOnStage(
            { judgmentForm: 'حضوري', lastJudgmentType: 'حضوري' },
            {
                judgmentForm: 'مختلط',
                partyJudgmentDispositions: [
                    { partyId: '2', form: 'حضوري' },
                    { partyId: '3', form: 'غيابي' },
                ],
                disputeIntegrity: 'severable',
            },
        );
        expect(stamped.judgmentForm).toBe('مختلط');
        expect(stamped.lastJudgmentType).toBeUndefined();
        expect(stamped.disputeIntegrity).toBe('severable');
        expect(stamped.partyJudgmentDispositions).toHaveLength(2);
    });

    it('لا يختم مرحلة اعتراض الحكم الغيابي', () => {
        expect(
            shouldPersistPartyJudgmentStamp('الاعتراض على الحكم الغيابي', {
                partyJudgmentDispositions: [{ partyId: '2', form: 'غيابي' }],
            }),
        ).toBe(false);
        expect(
            shouldPersistPartyJudgmentStamp('بداءة بدرجة أولى', {
                partyJudgmentDispositions: [{ partyId: '2', form: 'غيابي' }],
            }),
        ).toBe(true);
        expect(
            shouldPersistPartyJudgmentStamp('الاستئناف', {
                partyJudgmentDispositions: [{ partyId: '2', form: 'غيابي' }],
            }),
        ).toBe(false);
        expect(
            shouldPersistPartyJudgmentStamp('التمييز', {
                partyJudgmentDispositions: [{ partyId: '3', form: 'غيابي' }],
            }),
        ).toBe(false);
    });

    it('يملأ النوافذ المختلطة: حضوري وغيابي معاً', () => {
        const windows = resolveJudgmentPresenceWindows(
            [
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
            ],
            'مختلط',
        );
        expect(windows).toEqual({
            hasHadari: true,
            hasGhayabi: true,
            mixed: true,
            summary: 'مختلط',
        });
    });

    it('يُكمل dispositions الناقصة عند تغيّر قائمة المدعى عليهم', () => {
        expect(
            alignPartyJudgmentDispositions(
                [{ id: 2 }, { id: 3 }],
                [{ partyId: '2', form: 'غيابي' }],
                'حضوري',
            ),
        ).toEqual([
            { partyId: '2', form: 'غيابي', operative: 'bound' },
            { partyId: '3', form: 'حضوري', operative: 'bound' },
        ]);
        expect(
            alignPartyJudgmentDispositions(
                [{ id: 2 }, { id: 3 }],
                [
                    { partyId: '2', form: 'بمثابة الحضوري' },
                    { partyId: '3', form: 'غيابي' },
                ],
            ),
        ).toEqual([
            { partyId: '2', form: 'بمثابة الحضوري', operative: 'bound' },
            { partyId: '3', form: 'غيابي', operative: 'bound' },
        ]);
        expect(
            alignPartyJudgmentDispositions(
                [{ id: 2 }, { id: 3 }],
                [{ partyId: '2', form: 'حضوري', operative: 'released' }],
            ),
        ).toEqual([
            { partyId: '2', form: 'حضوري', operative: 'released' },
            { partyId: '3', form: 'حضوري', operative: 'bound' },
        ]);
    });

    it('يفرض رد جزئي عند أي released ويحافظ على bound الافتراضي', () => {
        expect(
            coerceJudgmentTypeForReleasedOperatives('إجابة الدعوى بالكامل', [
                { partyId: '2', form: 'حضوري', operative: 'released' },
                { partyId: '3', form: 'حضوري', operative: 'bound' },
            ]),
        ).toBe('رد الدعوى جزئياً');
        expect(
            coerceJudgmentTypeForReleasedOperatives('إجابة الدعوى بالكامل', [
                { partyId: '2', form: 'حضوري' },
            ]),
        ).toBe('إجابة الدعوى بالكامل');
        expect(hasAnyReleasedDisposition([{ partyId: '2', form: 'حضوري' }])).toBe(false);
        expect(
            hasAnyReleasedDisposition([{ partyId: '2', form: 'حضوري', operative: 'released' }]),
        ).toBe(true);
    });

    it('رد الجميع يفرض رد كلي لا جزئي', () => {
        expect(
            coerceJudgmentTypeForReleasedOperatives('إجابة الدعوى بالكامل', [
                { partyId: '2', form: 'حضوري', operative: 'released' },
                { partyId: '3', form: 'غيابي', operative: 'released' },
            ]),
        ).toBe('رد الدعوى كلياً');
        expect(
            coerceJudgmentTypeForReleasedOperatives('رد الدعوى جزئياً', [
                { partyId: '2', form: 'حضوري', operative: 'released' },
                { partyId: '3', form: 'حضوري', operative: 'released' },
            ]),
        ).toBe('رد الدعوى كلياً');
    });

    it('resolveJudgmentTypeFromPartyOperatives يشتق كسب/جزئي/كلي من إلزام/رد', () => {
        expect(
            resolveJudgmentTypeFromPartyOperatives([
                { partyId: '2', form: 'حضوري', operative: 'bound' },
                { partyId: '3', form: 'غيابي', operative: 'bound' },
            ]),
        ).toBe('إجابة الدعوى بالكامل');
        expect(
            resolveJudgmentTypeFromPartyOperatives([
                { partyId: '2', form: 'حضوري', operative: 'bound' },
                { partyId: '3', form: 'حضوري', operative: 'released' },
            ]),
        ).toBe('رد الدعوى جزئياً');
        expect(
            resolveJudgmentTypeFromPartyOperatives([
                { partyId: '2', form: 'حضوري', operative: 'released' },
                { partyId: '3', form: 'غيابي', operative: 'released' },
            ]),
        ).toBe('رد الدعوى كلياً');
        expect(
            resolveJudgmentTypeFromPartyOperatives(
                [
                    { partyId: '2', form: 'حضوري', operative: 'bound' },
                    { partyId: '3', form: 'حضوري', operative: 'bound' },
                ],
                'partial',
            ),
        ).toBe('رد الدعوى جزئياً');
    });

    it('clientDefendantEligibleForGhayabiObjection يشترط غيابي ملزَم للموكل', () => {
        const parties = [
            { id: 1, role: 'مدعي', isClient: false },
            { id: 2, role: 'مدعى عليه', isClient: false },
            { id: 3, role: 'مدعى عليه', isClient: true },
        ];
        expect(
            clientDefendantEligibleForGhayabiObjection(parties, [
                { partyId: '2', form: 'حضوري', operative: 'bound' },
                { partyId: '3', form: 'غيابي', operative: 'bound' },
            ]),
        ).toBe(true);
        expect(
            clientDefendantEligibleForGhayabiObjection(parties, [
                { partyId: '3', form: 'غيابي', operative: 'released' },
            ]),
        ).toBe(false);
        expect(
            clientDefendantEligibleForGhayabiObjection(parties, [
                { partyId: '3', form: 'حضوري', operative: 'bound' },
            ]),
        ).toBe(false);
    });
});

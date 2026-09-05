import { describe, expect, it } from 'vitest';
import {
    alignPartyJudgmentDispositions,
    clientDefendantHasGhayabiDisposition,
    isDisputeIndivisible,
    judgmentFormHasGhayabi,
    listJudgmentDispositionDefendants,
    normalizePartyJudgmentDispositions,
    parseDisputeIntegrity,
    resolveJudgmentPresenceWindows,
    seedPartyJudgmentDispositions,
    stampPartyJudgmentOnStage,
    summarizePartyJudgmentForm,
} from '../partyJudgmentDisposition';
import { partitionLawsuitPartiesByRole } from '../lawsuitPartyRole';

const FOUR_DEFENDANTS = [
    { id: 1, name: 'أحمد', role: 'مدعي', isClient: true },
    { id: 2, name: 'سامي', role: 'مدعى عليه', isClient: false },
    { id: 3, name: 'كريم', role: 'مدعى عليه', isClient: false },
    { id: 4, name: 'نادر', role: 'مدعى عليه', isClient: false },
    { id: 5, name: 'هيثم', role: 'مدعى عليه', isClient: false },
];

describe('مصفوفة تعدد الأطراف — صفة الحكم', () => {
    it('يحصي أربعة مدعى عليهم مع مدعيين دون الاختصامي المستقل', () => {
        const listed = listJudgmentDispositionDefendants([
            { id: 10, name: 'مدعي أول', role: 'مدعي', isClient: true },
            { id: 11, name: 'مدعي ثان', role: 'مدعي', isClient: false },
            { id: 2, name: 'سامي', role: 'مدعى عليه' },
            { id: 3, name: 'كريم', role: 'مدعى عليه الثاني' },
            { id: 4, name: 'نادر', role: 'defendant' },
            { id: 5, name: 'هيثم', role: 'مدين', side: 'left' },
            { id: 6, name: 'زيد', role: 'شخص ثالث اختصامي' },
            { id: 7, name: 'هناء', role: 'شخص ثالث انضمامي — جانب المدعى عليه' },
            { id: '', name: 'بلا معرف', role: 'مدعى عليه' },
        ]);
        expect(listed.map((p) => Number(p.id))).toEqual([2, 3, 4, 5, 7]);
    });

    it('يستبعد من ظهر في عمود المدعي والمدعى عليه معاً', () => {
        const { plaintiffs, defendants } = partitionLawsuitPartiesByRole([
            { id: 1, role: 'مدعي' },
            { id: 1, role: 'مدعى عليه' },
            { id: 2, role: 'مدعى عليه' },
        ]);
        expect(plaintiffs.map((p) => p.id)).toEqual([1]);
        expect(defendants.map((p) => p.id)).toEqual([2]);
    });

    it('يلخّص أربعة مدعى عليهم: كل الحضور / كل الغياب / غائب واحد / ثلاثة غائبين', () => {
        const ids = ['2', '3', '4', '5'];
        expect(summarizePartyJudgmentForm(ids.map((partyId) => ({ partyId, form: 'حضوري' as const })))).toBe(
            'حضوري',
        );
        expect(summarizePartyJudgmentForm(ids.map((partyId) => ({ partyId, form: 'غيابي' as const })))).toBe(
            'غيابي',
        );
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'حضوري' },
                { partyId: '4', form: 'حضوري' },
                { partyId: '5', form: 'غيابي' },
            ]),
        ).toBe('مختلط');
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: 'حضوري' },
                { partyId: '3', form: 'غيابي' },
                { partyId: '4', form: 'بمثابة الحضوري' },
                { partyId: '5', form: 'غيابي' },
            ]),
        ).toBe('مختلط');
        expect(
            summarizePartyJudgmentForm([
                { partyId: '2', form: 'غيابي' },
                { partyId: '3', form: 'غيابي' },
                { partyId: '4', form: 'غيابي' },
                { partyId: '5', form: 'حضوري' },
            ]),
        ).toBe('مختلط');
    });

    it('يوحّد معرف الطرف رقم/نص ويسقط المكرر والمعطوب', () => {
        expect(
            normalizePartyJudgmentDispositions([
                { partyId: 2, form: 'غيابي' },
                { partyId: '2', form: 'حضوري' },
                { partyId: ' 4 ', form: 'حضوري' },
                { partyId: 'x', form: 'مختلط' },
                null,
                'bad',
            ]),
        ).toEqual([
            { partyId: '2', form: 'غيابي', operative: 'bound' },
            { partyId: '4', form: 'حضوري', operative: 'bound' },
        ]);
    });

    it('يملأ الطرف الجديد عند زيادة المدعى عليهم دون محو صفة السابق', () => {
        expect(
            alignPartyJudgmentDispositions(
                FOUR_DEFENDANTS.filter((p) => p.role === 'مدعى عليه'),
                [
                    { partyId: '2', form: 'غيابي' },
                    { partyId: '3', form: 'حضوري' },
                ],
                'حضوري',
            ),
        ).toEqual([
            { partyId: '2', form: 'غيابي', operative: 'bound' },
            { partyId: '3', form: 'حضوري', operative: 'bound' },
            { partyId: '4', form: 'حضوري', operative: 'bound' },
            { partyId: '5', form: 'حضوري', operative: 'bound' },
        ]);
    });

    it('يحذف disposition لطرف خرج من القائمة', () => {
        expect(
            alignPartyJudgmentDispositions(
                [{ id: 2 }, { id: 4 }],
                [
                    { partyId: '2', form: 'غيابي' },
                    { partyId: '3', form: 'غيابي' },
                    { partyId: '4', form: 'حضوري' },
                ],
                'حضوري',
            ),
        ).toEqual([
            { partyId: '2', form: 'غيابي', operative: 'bound' },
            { partyId: '4', form: 'حضوري', operative: 'bound' },
        ]);
    });

    it('الموكل الغائب بين أربعة: يُلتقط فقط إن كان مدعى عليه غائباً', () => {
        const mixed = [
            { partyId: '2', form: 'حضوري' as const },
            { partyId: '3', form: 'غيابي' as const },
            { partyId: '4', form: 'حضوري' as const },
            { partyId: '5', form: 'غيابي' as const },
        ];
        expect(
            clientDefendantHasGhayabiDisposition(
                [
                    { id: 1, role: 'مدعي', isClient: true },
                    { id: 2, role: 'مدعى عليه', isClient: false },
                    { id: 3, role: 'مدعى عليه', isClient: false },
                ],
                mixed,
            ),
        ).toBe(false);
        expect(
            clientDefendantHasGhayabiDisposition(
                [
                    { id: 1, role: 'مدعي', isClient: false },
                    { id: 5, role: 'مدعى عليه', isClient: true },
                ],
                mixed,
            ),
        ).toBe(true);
        expect(
            clientDefendantHasGhayabiDisposition(
                [
                    { id: 2, role: 'مدعى عليه', isClient: true },
                    { id: 5, role: 'مدعى عليه', isClient: true },
                ],
                mixed,
            ),
        ).toBe(true);
        expect(
            clientDefendantHasGhayabiDisposition(
                [{ id: 2, role: 'مدعى عليه', isClient: true }],
                mixed,
            ),
        ).toBe(false);
    });

    it('نوافذ الحضور/الغياب لأربعة أطراف ولملف قديم بلا dispositions', () => {
        expect(
            resolveJudgmentPresenceWindows(
                [
                    { partyId: '2', form: 'حضوري' },
                    { partyId: '3', form: 'غيابي' },
                    { partyId: '4', form: 'غيابي' },
                    { partyId: '5', form: 'حضوري' },
                ],
                'حضوري',
            ),
        ).toEqual({
            hasHadari: true,
            hasGhayabi: true,
            mixed: true,
            summary: 'مختلط',
        });
        expect(resolveJudgmentPresenceWindows([], 'غيابي')).toEqual({
            hasHadari: false,
            hasGhayabi: true,
            mixed: false,
            summary: 'غيابي',
        });
        expect(resolveJudgmentPresenceWindows([], 'مختلط')).toEqual({
            hasHadari: true,
            hasGhayabi: true,
            mixed: true,
            summary: 'مختلط',
        });
        expect(judgmentFormHasGhayabi('حضوري', undefined, [
            { partyId: '5', form: 'غيابي' },
        ])).toBe(true);
        expect(judgmentFormHasGhayabi('مختلط', undefined, [
            { partyId: '2', form: 'حضوري' },
            { partyId: '3', form: 'حضوري' },
        ])).toBe(false);
    });

    it('يقبل تسمية وحدة النزاع بالعربية ويختم أربعة صفوف', () => {
        expect(parseDisputeIntegrity('غير قابل للتجزئة')).toBe('indivisible');
        expect(isDisputeIndivisible('غير قابل للتجزئة')).toBe(true);
        expect(isDisputeIndivisible('قابل للتجزئة')).toBe(false);
        const stamped = stampPartyJudgmentOnStage(
            {},
            {
                judgmentForm: 'مختلط',
                disputeIntegrity: 'غير قابل للتجزئة',
                partyJudgmentDispositions: seedPartyJudgmentDispositions(
                    [{ id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
                    'غيابي',
                ).map((row, i) => (i === 0 ? { ...row, form: 'حضوري' } : row)),
            },
        );
        expect(stamped.judgmentForm).toBe('مختلط');
        expect(stamped.disputeIntegrity).toBe('indivisible');
        expect(stamped.partyJudgmentDispositions).toHaveLength(4);
        expect(stamped.lastJudgmentType).toBeUndefined();
    });

    it('أدوار الطعن لا تُحسب مدعى عليهم للحكم البدائي إن كانوا مستأنفين فقط', () => {
        const listed = listJudgmentDispositionDefendants([
            { id: 1, role: 'المستأنف (المدعي)' },
            { id: 2, role: 'المستأنف عليه (المدعى عليه)' },
            { id: 3, role: 'المستأنف عليه (المدعى عليه)' },
        ]);
        expect(listed.map((p) => Number(p.id))).toEqual([2, 3]);
    });
});

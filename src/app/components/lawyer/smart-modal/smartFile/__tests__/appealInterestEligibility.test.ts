import { describe, expect, it } from 'vitest';
import {
    INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
    INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
    INTERPLEADER_JUDGMENT_THIRD_FULL,
} from '../interpleaderJudgmentEngine';
import {
    filterAppellantsByAppealInterest,
    partyHasMeritAppealInterest,
    resolvePartyAppealInterestBucket,
} from '../appealInterestEligibility';

const PLAINTIFF = { id: 1, name: 'أحمد', role: 'المدعي', side: 'right' as const };
const D1 = { id: 2, name: 'سامي', role: 'المدعى عليه', side: 'left' as const };
const D2 = { id: 3, name: 'باسم', role: 'المدعى عليه', side: 'left' as const };
const INTERPLEADER = { id: 5, name: 'نادر', role: 'شخص ثالث (اختصامي)' };

describe('appealInterestEligibility', () => {
    it('يصنّف مراكز الأطراف', () => {
        expect(resolvePartyAppealInterestBucket(PLAINTIFF)).toBe('plaintiff');
        expect(resolvePartyAppealInterestBucket(D1)).toBe('defendant');
        expect(resolvePartyAppealInterestBucket(INTERPLEADER)).toBe('interpleader');
    });

    it('S1 فوز المدعي: المدعي بلا مصلحة؛ المدعى عليه والاختصامي لهما مصلحة', () => {
        expect(partyHasMeritAppealInterest({ judgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, party: PLAINTIFF })).toBe(
            false,
        );
        expect(partyHasMeritAppealInterest({ judgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, party: D1 })).toBe(
            true,
        );
        expect(
            partyHasMeritAppealInterest({ judgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL, party: INTERPLEADER }),
        ).toBe(true);
    });

    it('S2 فوز الاختصامي: المدعي يطعن؛ المدعى عليه والاختصامي ينتظران', () => {
        expect(partyHasMeritAppealInterest({ judgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL, party: PLAINTIFF })).toBe(
            true,
        );
        expect(partyHasMeritAppealInterest({ judgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL, party: D1 })).toBe(false);
        expect(
            partyHasMeritAppealInterest({ judgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL, party: INTERPLEADER }),
        ).toBe(false);
    });

    it('S3 رد الدعويين: المدعى عليه بلا مصلحة؛ المدعي والاختصامي يطعنان', () => {
        expect(
            partyHasMeritAppealInterest({ judgmentType: INTERPLEADER_JUDGMENT_BOTH_DISMISSED, party: D1 }),
        ).toBe(false);
        expect(
            partyHasMeritAppealInterest({ judgmentType: INTERPLEADER_JUDGMENT_BOTH_DISMISSED, party: PLAINTIFF }),
        ).toBe(true);
        expect(
            partyHasMeritAppealInterest({
                judgmentType: INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
                party: INTERPLEADER,
            }),
        ).toBe(true);
    });

    it('فلتر الاستئناف يسقط الكاسبين ويُبقي الخاسرين', () => {
        const parties = [PLAINTIFF, D1, D2, INTERPLEADER];
        expect(
            filterAppellantsByAppealInterest(parties, {
                appealType: 'استئناف',
                judgmentType: INTERPLEADER_JUDGMENT_THIRD_FULL,
            }).map((p) => p.id),
        ).toEqual([1]);
        expect(
            filterAppellantsByAppealInterest(parties, {
                appealType: 'استئناف',
                judgmentType: INTERPLEADER_JUDGMENT_BOTH_DISMISSED,
            })
                .map((p) => p.id)
                .sort(),
        ).toEqual([1, 5]);
        expect(
            filterAppellantsByAppealInterest(parties, {
                appealType: 'استئناف',
                judgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
            })
                .map((p) => p.id)
                .sort(),
        ).toEqual([2, 3, 5]);
    });

    it('لا يصفّي مسار الاعتراض الغيابي ولا مراحل المعترض/المعترض عليه', () => {
        const objectionParties = [
            { id: 1, role: 'المعترض عليه بالحكم الغيابي (المدعي)' },
            { id: 4, role: 'المعترض على الحكم الغيابي (المدعى عليه)' },
        ];
        expect(
            filterAppellantsByAppealInterest(objectionParties, {
                appealType: 'استئناف',
                judgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
            }),
        ).toEqual(objectionParties);
        expect(
            filterAppellantsByAppealInterest([D1], {
                appealType: 'اعتراض على الحكم الغيابي',
                judgmentType: INTERPLEADER_JUDGMENT_PLAINTIFF_FULL,
            }),
        ).toEqual([D1]);
    });

    it('بلا نوع حكم لا يصفّي', () => {
        expect(
            filterAppellantsByAppealInterest([PLAINTIFF, D1], {
                appealType: 'استئناف',
            }),
        ).toEqual([PLAINTIFF, D1]);
    });

    it('المبرَّأ (released) بلا مصلحة طعن موضوعي', () => {
        const dispositions = [
            { partyId: '2', form: 'حضوري' as const, operative: 'released' as const },
            { partyId: '3', form: 'حضوري' as const, operative: 'bound' as const },
        ];
        expect(
            partyHasMeritAppealInterest({
                judgmentType: 'رد الدعوى جزئياً',
                party: D1,
                dispositions,
            }),
        ).toBe(false);
        expect(
            filterAppellantsByAppealInterest([PLAINTIFF, D1, D2], {
                appealType: 'استئناف',
                judgmentType: 'رد الدعوى جزئياً',
                dispositions,
            }).map((p) => p.id),
        ).toEqual([1, 3]);
    });
});

import { describe, expect, it } from 'vitest';
import type { CriminalActionParty } from './criminalStageUtils';
import {
    ARREST_ORDER_TEMPLATE,
    DEFENDANT_BAIL_TEMPLATE,
    DETENTION_DECISION_TEMPLATE,
    SUMMON_ORDER_TEMPLATE,
} from './proceduralRequestTypes';
import {
    filterPartiesForRequestTemplate,
    resolveAutoRequestPartyId,
    resolveRequestPartyIdsForPayload,
    shouldShowMultiPartySelectionPicker,
    shouldShowRequestPartyPicker,
} from './requestPartySelection';
import { JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE } from './proceduralRequestTypes';

const complainant = (
    id: string,
    fullName: string,
    opts?: { isAccusedAsComplainant?: boolean },
): CriminalActionParty => ({
    id,
    fullName,
    source: 'complainant',
    isDeceased: false,
    isAccusedAsComplainant: opts?.isAccusedAsComplainant,
});

const defendant = (id: string, fullName: string, isJuvenile = false): CriminalActionParty => ({
    id,
    fullName,
    source: 'defendant',
    isDeceased: false,
    isJuvenile,
});

describe('requestPartySelection', () => {
    /**
     * ⚖️ ملاحظة مهمة: المشتكون الذين يَدخلون مصفوفة `CriminalActionParty[]` يأتون من
     * `buildCriminalActionParties` التي تَستبعد المشتكي العادي وتُبقي فقط على المشتكي
     * المتقابل (isCrossComplaint=true) أو الكل عند case-level isMutualComplaint.
     * لذلك أيّ `complainant` يَصل لهذه الدالة هو متهمٌ ضمنياً في شكوى متقابلة.
     */
    it('arrest/summon: only defendants — complainants never listed', () => {
        const plain = [complainant('c1', 'علي'), defendant('d1', 'هناء')];
        expect(filterPartiesForRequestTemplate(plain, SUMMON_ORDER_TEMPLATE).map((p) => p.id)).toEqual(['d1']);
        const cross = [
            complainant('c1', 'علي', { isAccusedAsComplainant: true }),
            defendant('d1', 'هناء'),
        ];
        expect(filterPartiesForRequestTemplate(cross, ARREST_ORDER_TEMPLATE).map((p) => p.id)).toEqual(['d1']);
    });

    it('arrest target with defendants only → only defendants returned', () => {
        const parties = [defendant('d1', 'هناء')];
        expect(filterPartiesForRequestTemplate(parties, ARREST_ORDER_TEMPLATE).map((p) => p.id)).toEqual(['d1']);
    });

    it('auto-selects sole defendant for defense counsel on arrest order (no cross-complaint)', () => {
        const parties = [defendant('d1', 'هناء')];
        const auto = resolveAutoRequestPartyId(
            parties,
            ARREST_ORDER_TEMPLATE,
            {
                isUnknownPerpetrator: false,
                isDefense: true,
                complainantsCount: 1,
                defendantsCount: 1,
            },
            'defendant_side',
        );
        expect(auto).toBe('d1');
    });

    it('auto-selects sole defendant when cross-complaint complainant also on case', () => {
        const parties = [
            complainant('c1', 'علي', { isAccusedAsComplainant: true }),
            defendant('d1', 'هناء'),
        ];
        const auto = resolveAutoRequestPartyId(
            parties,
            ARREST_ORDER_TEMPLATE,
            {
                isUnknownPerpetrator: false,
                isDefense: true,
                complainantsCount: 1,
                defendantsCount: 1,
            },
            'defendant_side',
        );
        expect(auto).toBe('d1');
        expect(
            shouldShowRequestPartyPicker(
                parties,
                ARREST_ORDER_TEMPLATE,
                auto,
                false,
                'defendant_side',
            ),
        ).toBe(false);
    });

    it('hides picker when defense has one defendant only (no cross-complaint)', () => {
        const parties = [defendant('d1', 'هناء')];
        const auto = resolveAutoRequestPartyId(
            parties,
            SUMMON_ORDER_TEMPLATE,
            {
                isUnknownPerpetrator: false,
                isDefense: true,
                complainantsCount: 2,
                defendantsCount: 1,
            },
            'defendant_side',
        );
        expect(auto).toBe('d1');
        expect(
            shouldShowRequestPartyPicker(
                parties,
                SUMMON_ORDER_TEMPLATE,
                auto,
                false,
                'defendant_side',
            ),
        ).toBe(false);
    });

    it('does not show picker before template is chosen', () => {
        const parties = [complainant('c1', 'علي'), complainant('c2', 'وائل'), defendant('d1', 'هناء')];
        expect(
            shouldShowRequestPartyPicker(parties, '', null, false, 'complainant_side'),
        ).toBe(false);
    });

    it('shows picker when multiple defendants on detention decision', () => {
        const parties = [defendant('d1', 'أ'), defendant('d2', 'ب')];
        const auto = resolveAutoRequestPartyId(
            parties,
            DETENTION_DECISION_TEMPLATE,
            {
                isUnknownPerpetrator: false,
                isDefense: false,
                complainantsCount: 1,
                defendantsCount: 2,
            },
            'complainant_side',
        );
        expect(auto).toBeNull();
        expect(
            shouldShowRequestPartyPicker(
                parties,
                DETENTION_DECISION_TEMPLATE,
                auto,
                false,
                'complainant_side',
            ),
        ).toBe(true);
    });

    it('detention decision: cross-complaint complainant excluded from picker', () => {
        const parties = [
            complainant('c1', 'مشتكي متقابل', { isAccusedAsComplainant: true }),
            defendant('d1', 'متهم'),
        ];
        expect(
            filterPartiesForRequestTemplate(parties, DETENTION_DECISION_TEMPLATE).map((p) => p.id),
        ).toEqual(['d1']);
        const auto = resolveAutoRequestPartyId(
            parties,
            DETENTION_DECISION_TEMPLATE,
            {
                isUnknownPerpetrator: false,
                isDefense: false,
                complainantsCount: 1,
                defendantsCount: 1,
            },
            'complainant_side',
        );
        expect(auto).toBe('d1');
        expect(
            shouldShowRequestPartyPicker(
                parties,
                DETENTION_DECISION_TEMPLATE,
                auto,
                false,
                'complainant_side',
            ),
        ).toBe(false);
    });

    it('juvenile judge decision: sole juvenile auto-selected, picker hidden', () => {
        const parties = [defendant('j1', 'حدث', true), defendant('a1', 'بالغ', false)];
        const juvenileOnly = parties.filter((p) => p.isJuvenile);
        expect(shouldShowMultiPartySelectionPicker(juvenileOnly.length)).toBe(false);
        const auto = resolveAutoRequestPartyId(
            juvenileOnly,
            JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
            {
                isUnknownPerpetrator: false,
                isDefense: false,
                complainantsCount: 1,
                defendantsCount: 2,
            },
            undefined,
            'juvenile',
        );
        expect(auto).toBe('j1');
        expect(
            shouldShowRequestPartyPicker(
                juvenileOnly,
                JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
                auto,
                false,
                undefined,
                'juvenile',
            ),
        ).toBe(false);
        const ids = resolveRequestPartyIdsForPayload(
            [],
            auto,
            juvenileOnly,
            JUVENILE_SOCIAL_INQUIRY_REFERRAL_TEMPLATE,
            'complainant_side',
            {
                isUnknownPerpetrator: false,
                isDefense: false,
                complainantsCount: 1,
                defendantsCount: 2,
            },
            'juvenile',
        );
        expect(ids).toEqual(['j1']);
    });

    it('adult bail in mixed dossier: adults only, sole adult auto-selected', () => {
        const parties = [defendant('j1', 'حدث', true), defendant('a1', 'بالغ', false)];
        const adultsOnly = filterPartiesForRequestTemplate(
            parties,
            DEFENDANT_BAIL_TEMPLATE,
            undefined,
            'adult',
        );
        expect(adultsOnly.map((p) => p.id)).toEqual(['a1']);
        expect(shouldShowMultiPartySelectionPicker(adultsOnly.length)).toBe(false);
        const auto = resolveAutoRequestPartyId(
            adultsOnly,
            DEFENDANT_BAIL_TEMPLATE,
            {
                isUnknownPerpetrator: false,
                isDefense: false,
                complainantsCount: 1,
                defendantsCount: 2,
            },
            undefined,
            'adult',
        );
        expect(auto).toBe('a1');
    });

    it('detention: multiple complainants — defendants only', () => {
        const parties = [
            complainant('c-plain', 'مشتكي عادي'),
            complainant('c-cross', 'مشتكي متقابل', { isAccusedAsComplainant: true }),
            defendant('d1', 'متهم'),
        ];
        expect(
            filterPartiesForRequestTemplate(parties, DETENTION_DECISION_TEMPLATE).map((p) => p.id),
        ).toEqual(['d1']);
    });
});

import { describe, expect, it } from 'vitest';
import {
    applyClientMarkForParty,
    markPartyAsClient,
    otherSideHasClient,
} from '../partyClientFlags';
import type { Party } from '../types';

const party = (id: string, isClient = false): Party => ({
    id,
    name: id,
    status: 'المدعي',
    isClient,
    phone: '',
    address: '',
    hasLawyer: false,
    lawyerName: '',
    lawyerPhone: '',
    isMyOffice: isClient,
});

describe('applyClientMarkForParty', () => {
    it('يسمح بموكلين على نفس الطرف', () => {
        const first = markPartyAsClient(party('p1'));
        const second = party('p2');
        const next = applyClientMarkForParty({
            side: 1,
            id: 'p2',
            parties1: [first, second],
            parties2: [party('d1')],
            thirdParties: [],
        });
        expect(next.ok).toBe(true);
        if (!next.ok) return;
        expect(next.parties1.filter((p) => p.isClient).map((p) => p.id)).toEqual(['p1', 'p2']);
        expect(next.parties2.some((p) => p.isClient)).toBe(false);
    });

    it('يرفض تمثيل الطرف الآخر عند وجود موكل على هذا الجانب', () => {
        const next = applyClientMarkForParty({
            side: 2,
            id: 'd1',
            parties1: [markPartyAsClient(party('p1'))],
            parties2: [party('d1')],
            thirdParties: [],
        });
        expect(next.ok).toBe(false);
        expect(
            otherSideHasClient(2, [markPartyAsClient(party('p1'))], [party('d1')], []),
        ).toBe(true);
    });
});

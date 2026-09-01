import type { Party, ThirdParty } from './types';

export function clearClientFromParty(p: Party): Party {
    return {
        ...p,
        isClient: false,
        isMyOffice: false,
        lawyerName: p.isMyOffice ? '' : (p.lawyerName ?? ''),
    };
}

export function markPartyAsClient(p: Party): Party {
    return {
        ...p,
        isClient: true,
        isMyOffice: true,
        lawyerName: 'مكتبي (الوكيل الأصيل)',
    };
}

export function clearClientFromThirdParty(tp: ThirdParty): ThirdParty {
    return {
        ...tp,
        isClient: false,
        isMyOffice: false,
        lawyerName: tp.isMyOffice ? '' : tp.lawyerName,
    };
}

export function markThirdPartyAsClient(tp: ThirdParty): ThirdParty {
    return {
        ...tp,
        isClient: true,
        isMyOffice: true,
        lawyerName: 'مكتبي (الوكيل الأصيل)',
    };
}

export function applyClientMarkForParty(input: {
    side: 1 | 2;
    id: string;
    parties1: Party[];
    parties2: Party[];
    thirdParties: ThirdParty[];
}):
    | { ok: true; parties1: Party[]; parties2: Party[]; thirdParties: ThirdParty[] }
    | { ok: false } {
    const { side, id, parties1, parties2, thirdParties } = input;
    if (otherSideHasClient(side, parties1, parties2, thirdParties)) {
        return { ok: false };
    }
    const markSameSide = (list: Party[]) =>
        list.map((p) => (p.id === id ? markPartyAsClient(p) : p));
    const clearSide = (list: Party[]) => list.map(clearClientFromParty);
    const nextThird = thirdParties.map((tp) => {
        if (tp.entryMode === 'affiliative' && tp.affiliatedSide === side) return tp;
        return clearClientFromThirdParty(tp);
    });
    if (side === 1) {
        return {
            ok: true,
            parties1: markSameSide(parties1),
            parties2: clearSide(parties2),
            thirdParties: nextThird,
        };
    }
    return {
        ok: true,
        parties1: clearSide(parties1),
        parties2: markSameSide(parties2),
        thirdParties: nextThird,
    };
}

export function applyClientMarkForThirdParty(input: {
    id: number;
    parties1: Party[];
    parties2: Party[];
    thirdParties: ThirdParty[];
}):
    | { ok: true; parties1: Party[]; parties2: Party[]; thirdParties: ThirdParty[] }
    | { ok: false } {
    const target = input.thirdParties.find((tp) => tp.id === input.id);
    if (!target) return { ok: false };

    if (target.entryMode !== 'affiliative' || !target.affiliatedSide) {
        const otherClient =
            input.parties1.some((p) => p.isClient || p.isMyOffice) ||
            input.parties2.some((p) => p.isClient || p.isMyOffice) ||
            input.thirdParties.some((tp) => tp.id !== input.id && (tp.isClient || tp.isMyOffice));
        if (otherClient) return { ok: false };
        return {
            ok: true,
            parties1: input.parties1.map(clearClientFromParty),
            parties2: input.parties2.map(clearClientFromParty),
            thirdParties: input.thirdParties.map((tp) =>
                tp.id === input.id ? markThirdPartyAsClient(tp) : clearClientFromThirdParty(tp),
            ),
        };
    }

    const side = target.affiliatedSide;
    if (otherSideHasClient(side, input.parties1, input.parties2, input.thirdParties)) {
        return { ok: false };
    }
    const clearOther = (list: Party[]) => list.map(clearClientFromParty);
    const nextThird = input.thirdParties.map((tp) => {
        if (tp.id === input.id) return markThirdPartyAsClient(tp);
        if (tp.entryMode === 'affiliative' && tp.affiliatedSide === side) return tp;
        return clearClientFromThirdParty(tp);
    });
    if (side === 1) {
        return {
            ok: true,
            parties1: input.parties1,
            parties2: clearOther(input.parties2),
            thirdParties: nextThird,
        };
    }
    return {
        ok: true,
        parties1: clearOther(input.parties1),
        parties2: input.parties2,
        thirdParties: nextThird,
    };
}

export function otherSideHasClient(
    side: 1 | 2,
    parties1: Party[],
    parties2: Party[],
    thirdParties: ThirdParty[],
): boolean {
    const other = side === 1 ? 2 : 1;
    const otherParties = other === 1 ? parties1 : parties2;
    return (
        otherParties.some((p) => p.isClient || p.isMyOffice) ||
        thirdParties.some(
            (tp) =>
                tp.isClient &&
                (tp.affiliatedSide === other || tp.entryMode === 'interpleader'),
        )
    );
}

export function getAddPartyButtonText(side: 1 | 2, parties: Party[]): string {
    if (parties.length === 0) return 'إضافة طرف آخر';
    /** يطابق getLegalRole («المدعي») والاختبارات القصيرة («مدعي»). */
    const role = parties[0]!.status.trim().replace(/^ال/, '');
    if (side === 1) {
        if (role === 'مدعي') return 'إضافة مدعي آخر';
        if (role === 'مستأنف') return 'إضافة مستأنف آخر';
    } else {
        if (role === 'مدعى عليه') return 'إضافة مدعى عليه آخر';
        if (role === 'مستأنف عليه') return 'إضافة مستأنف عليه آخر';
    }
    return 'إضافة طرف آخر';
}

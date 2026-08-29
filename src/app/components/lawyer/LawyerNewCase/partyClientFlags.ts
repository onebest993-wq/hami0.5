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


export function readPartyEntityKind(party: {
    entityKind?: string;
    entityType?: string;
    type?: string;
}): 'natural_person' | 'legal_entity' {
    const v =
        party.entityKind ??
        party.entityType ??
        (party.type === 'company' ? 'legal_entity' : 'natural_person');
    if (
        v === 'legal_entity' ||
        v === 'legal' ||
        v === 'company' ||
        v === 'معنوي' ||
        v === 'شخص معنوي'
    ) {
        return 'legal_entity';
    }
    return 'natural_person';
}

/** عند تعدد المدينين — لا يُmezج طبيعي مع معنوي */
export function resolveLockedDebtorEntityKind(
    debtors: Array<{ entityKind?: string; entityType?: string; type?: string }>,
    additionalDebtors: Array<{ entityKind?: string; entityType?: string; type?: string }>,
): 'natural_person' | 'legal_entity' | null {
    const all = [...debtors, ...additionalDebtors];
    if (all.length <= 1) return null;
    if (all.some((d) => readPartyEntityKind(d) === 'legal_entity')) {
        return 'legal_entity';
    }
    return 'natural_person';
}

export function canSetDebtorEntityKind(
    debtors: Array<{ id: number | string; entityKind?: string; entityType?: string; type?: string }>,
    additionalDebtors: Array<{ id: string; entityKind?: string; entityType?: string; type?: string }>,
    partyId: number | string,
    nextKind: 'natural_person' | 'legal_entity',
): boolean {
    const all = [...debtors, ...additionalDebtors];
    if (all.length <= 1) return true;
    for (const d of all) {
        if (String(d.id) === String(partyId)) continue;
        if (readPartyEntityKind(d) !== nextKind) return false;
    }
    return true;
}

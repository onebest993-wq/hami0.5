function applyDebtorEntityKindRow(
    row: Record<string, unknown>,
    targetKind: 'natural_person' | 'legal_entity'
): Record<string, unknown> {
    const partyType = targetKind === 'legal_entity' ? 'company' : 'individual';
    const next: Record<string, unknown> = {
        ...row,
        entityKind: targetKind,
        entityType: targetKind,
        type: partyType,
    };
    if (targetKind === 'legal_entity') {
        next.isEmployee = false;
        next.isClient = false;
        next.occupation = 'معنوي';
        next.employmentType = 'معنوي';
    }
    return next;
}

function syncDebtorEntityKindInParties(
    parties: unknown[] | undefined,
    nextRow: Record<string, unknown>,
    debtorKey: string,
    primaryKey: string,
): unknown[] | undefined {
    if (!Array.isArray(parties) || parties.length === 0) return undefined;
    let primaryDebtorPartySeen = false;
    return parties.map((raw) => {
        if (!raw || typeof raw !== 'object') return raw;
        const p = raw as Record<string, unknown>;
        const role = String(p.role ?? '');
        const isDebtorRole = role === 'المدين' || role.toLowerCase() === 'debtor';
        if (!isDebtorRole) return raw;
        const pid = String(p.id ?? '').trim();
        const matchAdditional = pid !== '' && pid === debtorKey;
        const matchPrimary =
            debtorKey === primaryKey &&
            (!primaryDebtorPartySeen || pid === primaryKey || pid === String(nextRow.id ?? ''));
        if (matchAdditional || matchPrimary) {
            if (debtorKey === primaryKey) primaryDebtorPartySeen = true;
            return {
                ...p,
                entityKind: nextRow.entityKind,
                entityType: nextRow.entityType,
                type: nextRow.type,
                ...(nextRow.entityKind === 'legal_entity'
                    ? { occupation: 'معنوي', isEmployee: false }
                    : {}),
            };
        }
        return raw;
    });
}

export const buildDebtorEntityKindPatch = (
    executionData: any,
    debtorKey: string,
    targetKind: 'natural_person' | 'legal_entity'
): Record<string, unknown> | null => {
    if (!executionData || !debtorKey) return null;
    const prim = executionData.debtors?.[0];
    const primaryKey =
        prim?.id != null && String(prim.id).trim() !== ''
            ? String(prim.id)
            : 'primary_debtor';
    const byDebtor = {
        ...(executionData.debtor_entity_kind_by_debtor || {}),
        [debtorKey]: targetKind,
    };
    if (debtorKey === primaryKey) {
        const list = Array.isArray(executionData.debtors) ? executionData.debtors : [];
        if (!list.length) return null;
        const next0 = applyDebtorEntityKindRow((list[0] || {}) as Record<string, unknown>, targetKind);
        const nextDebtors = [...list];
        nextDebtors[0] = next0;
        const nextParties = syncDebtorEntityKindInParties(
            executionData.parties,
            next0,
            debtorKey,
            primaryKey
        );
        return {
            debtors: nextDebtors,
            debtor: next0,
            debtor_entity_kind: targetKind,
            debtor_entity_type: targetKind,
            debtor_entity_kind_by_debtor: byDebtor,
            ...(nextParties ? { parties: nextParties } : {}),
        };
    }
    const adIdx = (executionData.party_multiplicity?.additionalDebtors || []).findIndex(
        (a: any) => String(a.id) === debtorKey
    );
    if (adIdx < 0) return null;
    const ad = executionData.party_multiplicity.additionalDebtors[adIdx];
    const nextAd = applyDebtorEntityKindRow(ad as Record<string, unknown>, targetKind);
    const nextAds = [...(executionData.party_multiplicity?.additionalDebtors || [])];
    nextAds[adIdx] = nextAd;
    const nextParties = syncDebtorEntityKindInParties(
        executionData.parties,
        nextAd,
        debtorKey,
        primaryKey
    );
    return {
        party_multiplicity: { ...executionData.party_multiplicity, additionalDebtors: nextAds },
        debtor_entity_kind_by_debtor: byDebtor,
        ...(nextParties ? { parties: nextParties } : {}),
    };
};

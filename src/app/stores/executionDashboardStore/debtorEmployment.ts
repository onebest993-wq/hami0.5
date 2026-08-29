export const isDebtorRowEmployee = (debtor: any): boolean => {
    if (!debtor) return false;
    if (debtor.isEmployee === true) return true;
    if (debtor.isEmployee === false) return false;
    const occ = String(debtor.occupation ?? debtor.employmentType ?? '').trim();
    return occ === 'موظف' || occ === 'employee' || occ === 'موظفة';
};

export const debtorEmploymentToggleMenuLabel = (isEmployee: boolean, _initial?: boolean) =>
    isEmployee ? 'تحويل إلى كاسب' : 'توظيف';

function applyDebtorEmploymentToggleRow(row: Record<string, unknown>): Record<string, unknown> {
    const current = isDebtorRowEmployee(row);
    const nextIsEmployee = !current;
    const occ = nextIsEmployee ? 'موظف' : 'كاسب';
    const employmentInitialWasEmployee =
        typeof row.employmentInitialWasEmployee === 'boolean'
            ? row.employmentInitialWasEmployee
            : current;
    return {
        ...row,
        occupation: occ,
        employmentType: occ,
        isEmployee: nextIsEmployee,
        employmentInitialWasEmployee,
    };
}

function syncDebtorEmploymentInParties(
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
                occupation: nextRow.occupation,
                employmentType: nextRow.employmentType,
                isEmployee: nextRow.isEmployee,
                employmentInitialWasEmployee: nextRow.employmentInitialWasEmployee,
            };
        }
        return raw;
    });
}

export const buildDebtorEmploymentTogglePatch = (executionData: any, debtorKey: string): Record<string, unknown> | null => {
    if (!executionData || !debtorKey) return null;
    const prim = executionData.debtors?.[0];
    const primaryKey =
        prim?.id != null && String(prim.id).trim() !== ''
            ? String(prim.id)
            : 'primary_debtor';
    if (debtorKey === primaryKey) {
        const list = Array.isArray(executionData.debtors) ? executionData.debtors : [];
        if (!list.length) return null;
        const next0 = applyDebtorEmploymentToggleRow((list[0] || {}) as Record<string, unknown>);
        const nextDebtors = [...list];
        nextDebtors[0] = next0;
        const nextParties = syncDebtorEmploymentInParties(
            executionData.parties,
            next0,
            debtorKey,
            primaryKey,
        );
        return {
            debtors: nextDebtors,
            debtor: next0,
            ...(nextParties ? { parties: nextParties } : {}),
        };
    }
    const adIdx = (executionData.party_multiplicity?.additionalDebtors || []).findIndex(
        (a: any) => String(a.id) === debtorKey
    );
    if (adIdx < 0) return null;
    const ad = executionData.party_multiplicity.additionalDebtors[adIdx];
    const nextAd = applyDebtorEmploymentToggleRow(ad as Record<string, unknown>);
    const nextAds = [...(executionData.party_multiplicity?.additionalDebtors || [])];
    nextAds[adIdx] = nextAd;
    const nextParties = syncDebtorEmploymentInParties(
        executionData.parties,
        nextAd,
        debtorKey,
        primaryKey,
    );
    return {
        party_multiplicity: { ...executionData.party_multiplicity, additionalDebtors: nextAds },
        ...(nextParties ? { parties: nextParties } : {}),
    };
};

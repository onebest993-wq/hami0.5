import type { ExecutionFile } from '@/app/types/execution';

export type PartyDeathCaseRecord = NonNullable<ExecutionFile['party_death_case']>;

/** مسار وفاة/ورثة طرف واحد — لا يخلط بين الدائن والمدين */
export function getPartyDeathCaseForRole(
    file: ExecutionFile | null | undefined,
    role: 'creditor' | 'debtor'
): PartyDeathCaseRecord | null | undefined {
    const scoped =
        role === 'creditor' ? file?.creditor_party_death_case : file?.debtor_party_death_case;
    if (scoped) return scoped;
    const legacy = file?.party_death_case;
    if (legacy?.deceased_party === role) return legacy;
    return null;
}

export function isPartyDeathCaseForRole(
    file: ExecutionFile | null | undefined,
    role: 'creditor' | 'debtor'
): boolean {
    return getPartyDeathCaseForRole(file, role) != null;
}

/** دمج حفظ — يحدّث مسار الطرف المحدد دون المساس بمسار الطرف الآخر */
export function buildScopedPartyDeathPersistPatch(
    base: ExecutionFile | null | undefined,
    role: 'creditor' | 'debtor',
    nextCase: PartyDeathCaseRecord
): Pick<ExecutionFile, 'creditor_party_death_case' | 'debtor_party_death_case'> {
    const creditorCase =
        role === 'creditor'
            ? { ...nextCase, deceased_party: 'creditor' as const }
            : (getPartyDeathCaseForRole(base, 'creditor') ?? null);
    const debtorCase =
        role === 'debtor'
            ? { ...nextCase, deceased_party: 'debtor' as const }
            : (getPartyDeathCaseForRole(base, 'debtor') ?? null);
    return {
        creditor_party_death_case: creditorCase,
        debtor_party_death_case: debtorCase,
    };
}

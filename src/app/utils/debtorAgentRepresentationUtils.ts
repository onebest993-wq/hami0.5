import type { ExecutionFile } from '@/app/types/execution';

function collectDebtors(data: ExecutionFile | Record<string, unknown> | null | undefined) {
    const primary = Array.isArray(data?.debtors) ? data!.debtors! : [];
    const additional = Array.isArray(
        (data as { party_multiplicity?: { additionalDebtors?: unknown[] } } | null | undefined)
            ?.party_multiplicity?.additionalDebtors
    )
        ? ((data as { party_multiplicity?: { additionalDebtors?: unknown[] } }).party_multiplicity!
              .additionalDebtors as Array<{ isClient?: boolean }>)
        : [];
    return [...primary, ...additional];
}

function collectCreditors(data: ExecutionFile | Record<string, unknown> | null | undefined) {
    const primary = Array.isArray(data?.creditors) ? data!.creditors! : [];
    const additional = Array.isArray(
        (data as { party_multiplicity?: { additionalCreditors?: unknown[] } } | null | undefined)
            ?.party_multiplicity?.additionalCreditors
    )
        ? ((data as { party_multiplicity?: { additionalCreditors?: unknown[] } }).party_multiplicity!
              .additionalCreditors as Array<{ isClient?: boolean }>)
        : [];
    return [...primary, ...additional];
}

/** المحامي يمثل المدين (موكله) — لا يطلب إجراءات جبريّة ضد موكله */
export function isLawyerRepresentingDebtor(
    executionData: ExecutionFile | Record<string, unknown> | null | undefined
): boolean {
    if (!executionData) return false;

    const rp = String(
        (executionData as { representedParty?: string; initiatorRole?: string }).representedParty ??
            (executionData as { initiatorRole?: string }).initiatorRole ??
            ''
    )
        .trim()
        .toLowerCase();

    if (rp === 'debtor' || rp === 'المدين' || rp === 'المدعى عليه') return true;
    if (rp === 'creditor' || rp === 'الدائن' || rp === 'المدعي') return false;

    const debtorClient = collectDebtors(executionData).some((d) => Boolean(d?.isClient));
    const creditorClient = collectCreditors(executionData).some((c) => Boolean(c?.isClient));
    if (debtorClient && !creditorClient) return true;
    return false;
}

import type { DebtorWorkspaceEntry } from '@/app/components/lawyer/ExecutionDashboard/hooks/useDebtorWorkspaceEntries';
import type { UnifiedExecutionDebtorRow } from '@/app/components/lawyer/ExecutionDashboard/types';

export type DebtorLiabilityGroupId = 'solidary' | 'independent';

export type DebtorLiabilityGroup = {
    id: DebtorLiabilityGroupId;
    /** مفتاح فريد للتبويب — solidary أو independent:{debtorKey} */
    tabKey: string;
    label: string;
    entries: DebtorWorkspaceEntry[];
};

function parseMoneyLike(v: unknown): number {
    if (typeof v === 'number') return Number.isFinite(v) ? Math.max(0, v) : 0;
    if (typeof v === 'string') {
        const cleaned = v.replace(/[^0-9.]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? Math.max(0, n) : 0;
    }
    return 0;
}

function resolveRowForEntry(
    rows: Array<Record<string, unknown>>,
    ent: DebtorWorkspaceEntry,
): Record<string, unknown> | undefined {
    if (ent.isPrimary) return rows[0];
    const key = String(ent.key);
    return rows.find((r) => String(r.id ?? '') === key);
}

/** وضع تقسيم مستقل/ضامن لكل مدين — من flags الإنشاء */
export function isPerDebtorSolidarySplitMode(
    allDebtorsUnified: UnifiedExecutionDebtorRow[],
    additionalDebtors?: Array<{ isSolidaryLiability?: boolean }>,
): boolean {
    if (allDebtorsUnified.length <= 1) return false;
    const primaryFlag = allDebtorsUnified[0]?.isSolidaryLiability;
    if (primaryFlag !== undefined) return true;
    return Boolean(additionalDebtors?.some((d) => d.isSolidaryLiability !== undefined));
}

export function buildDebtorLiabilityGroups(
    entries: DebtorWorkspaceEntry[],
): DebtorLiabilityGroup[] {
    const solidary: DebtorWorkspaceEntry[] = [];
    const independent: DebtorWorkspaceEntry[] = [];
    for (const ent of entries) {
        if (Boolean(ent.unified.isSolidaryLiability)) solidary.push(ent);
        else independent.push(ent);
    }
    const groups: DebtorLiabilityGroup[] = [];
    if (solidary.length > 0) {
        groups.push({
            id: 'solidary',
            tabKey: 'solidary',
            label: 'الذمة المتضامنة',
            entries: solidary,
        });
    }
    for (const ent of independent) {
        const name =
            String(ent.unified?.name ?? (ent.d as { name?: string })?.name ?? '').trim() ||
            'مدين مستقل';
        groups.push({
            id: 'independent',
            tabKey: `independent:${ent.key}`,
            label: name,
            entries: [ent],
        });
    }
    return groups;
}

export function shouldShowDebtorLiabilityGroupTabs(
    perDebtorSolidaryMode: boolean,
    groups: DebtorLiabilityGroup[],
): boolean {
    if (!perDebtorSolidaryMode || groups.length === 0) return false;
    const totalEntries = groups.reduce((n, g) => n + g.entries.length, 0);
    return totalEntries > 1;
}

export function resolveLiabilityGroupPrincipal(
    rows: Array<Record<string, unknown>>,
    partyMultiplicity: Record<string, unknown> | undefined,
    group: DebtorLiabilityGroup,
): number {
    if (group.id === 'solidary') {
        const solidaryRows = rows.filter((r) => Boolean(r.isSolidaryLiability));
        if (solidaryRows.length === 0) return 0;
        const remainder = parseMoneyLike(partyMultiplicity?.solidaryRemainderDebt);
        if (remainder > 0) return remainder;
        return Math.max(
            ...solidaryRows.map((r) => parseMoneyLike(r.allocated_debt)),
            0,
        );
    }
    return group.entries.reduce((sum, ent) => {
        const row = resolveRowForEntry(rows, ent);
        return sum + parseMoneyLike(row?.allocated_debt);
    }, 0);
}

export function resolveLiabilityGroupLawyerFees(
    rows: Array<Record<string, unknown>>,
    globalLawyerFees: number,
    group: DebtorLiabilityGroup,
): number {
    const independentClaimSum = rows
        .filter((r) => !r.isSolidaryLiability)
        .reduce((sum, row) => sum + parseMoneyLike(row.lawyerFeesClaimAmount), 0);

    if (group.id === 'independent') {
        return group.entries.reduce((sum, ent) => {
            const row = resolveRowForEntry(rows, ent);
            return sum + parseMoneyLike(row?.lawyerFeesClaimAmount);
        }, 0);
    }

    return Math.max(0, parseMoneyLike(globalLawyerFees) - independentClaimSum);
}

export function readAllDebtorRowsFromExecution(
    executionData: Record<string, unknown> | null | undefined,
): Array<Record<string, unknown>> {
    const primary = Array.isArray(executionData?.debtors)
        ? (executionData.debtors as Array<Record<string, unknown>>)
        : [];
    const pm = executionData?.party_multiplicity as Record<string, unknown> | undefined;
    const additional = Array.isArray(pm?.additionalDebtors)
        ? (pm.additionalDebtors as Array<Record<string, unknown>>)
        : [];
    return [...primary, ...additional];
}

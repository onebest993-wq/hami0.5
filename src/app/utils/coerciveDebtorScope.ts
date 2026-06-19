import type { ExecutionFile } from '@/app/types/execution';

function readBooleanMapValue(
    map: Record<string, boolean> | undefined,
    key: string,
): boolean | null {
    if (!map || !(key in map)) return null;
    return Boolean(map[key]);
}

function readStringMapValue(
    map: Record<string, string> | undefined,
    key: string,
): string | null {
    if (!map) return null;
    const v = String(map[key] ?? '').trim();
    return v || null;
}

export function isDebtorTravelBanActive(
    file: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKey: string,
): boolean {
    const dk = String(debtorKey);
    const pk = String(primaryDebtorKey);
    const scoped = readBooleanMapValue(file?.debtor_travel_ban_active_by_debtor, dk);
    if (scoped !== null) return scoped;
    if (dk === pk) return file?.debtor_travel_ban_active === true;
    return false;
}

export function isDebtorTravelBanWithdrawn(
    file: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKey: string,
): boolean {
    const dk = String(debtorKey);
    const pk = String(primaryDebtorKey);
    const scoped = readStringMapValue(file?.travel_ban_withdrawn_at_by_debtor, dk);
    if (scoped) return true;
    if (dk === pk) return Boolean(String(file?.travel_ban_withdrawn_at ?? '').trim());
    return false;
}

export function isDebtorTravelBanCycleWithdrawn(
    file: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKey: string,
): boolean {
    const dk = String(debtorKey);
    const pk = String(primaryDebtorKey);
    const scoped = readStringMapValue(file?.travel_ban_request_cycle_withdrawn_at_by_debtor, dk);
    if (scoped) return true;
    if (dk === pk) {
        return Boolean(String(file?.travel_ban_request_cycle_withdrawn_at ?? '').trim());
    }
    return false;
}

export function buildDebtorTravelBanActivePatch(
    file: ExecutionFile,
    debtorKey: string,
    primaryDebtorKey: string,
    active: boolean,
): Record<string, unknown> {
    const dk = String(debtorKey);
    const isPrimary = dk === String(primaryDebtorKey);
    const map = { ...(file.debtor_travel_ban_active_by_debtor ?? {}) };
    map[dk] = active;
    const patch: Record<string, unknown> = { debtor_travel_ban_active_by_debtor: map };
    if (isPrimary) patch.debtor_travel_ban_active = active;
    return patch;
}

export function buildDebtorTravelBanWithdrawnPatch(
    file: ExecutionFile,
    debtorKey: string,
    primaryDebtorKey: string,
    withdrawnAt: string | null,
): Record<string, unknown> {
    const dk = String(debtorKey);
    const isPrimary = dk === String(primaryDebtorKey);
    const map = { ...(file.travel_ban_withdrawn_at_by_debtor ?? {}) };
    if (withdrawnAt) map[dk] = withdrawnAt;
    else delete map[dk];
    const patch: Record<string, unknown> = { travel_ban_withdrawn_at_by_debtor: map };
    if (isPrimary) patch.travel_ban_withdrawn_at = withdrawnAt;
    return patch;
}

export function buildDebtorTravelBanCycleWithdrawnPatch(
    file: ExecutionFile,
    debtorKey: string,
    primaryDebtorKey: string,
    withdrawnAt: string | null,
): Record<string, unknown> {
    const dk = String(debtorKey);
    const isPrimary = dk === String(primaryDebtorKey);
    const map = { ...(file.travel_ban_request_cycle_withdrawn_at_by_debtor ?? {}) };
    if (withdrawnAt) map[dk] = withdrawnAt;
    else delete map[dk];
    const patch: Record<string, unknown> = { travel_ban_request_cycle_withdrawn_at_by_debtor: map };
    if (isPrimary) patch.travel_ban_request_cycle_withdrawn_at = withdrawnAt;
    return patch;
}

/** اسم المدين من مفتاح workspace — للبطاقات والطلبات */
export function resolveDebtorDisplayNameForKey(
    file: ExecutionFile | null | undefined,
    debtorKey: string,
    primaryDebtorKey: string,
): string | null {
    const dk = String(debtorKey).trim();
    if (!dk || !file) return null;
    const pk = String(primaryDebtorKey);
    if (dk === pk) {
        const n = String(file.debtors?.[0]?.name ?? '').trim();
        return n || null;
    }
    const ad = file.party_multiplicity?.additionalDebtors?.find((a) => String(a.id) === dk);
    const name = String(ad?.name ?? '').trim();
    return name || null;
}

export function countActiveDebtorsInFile(file: ExecutionFile | null | undefined): number {
    if (!file) return 0;
    const primary = Array.isArray(file.debtors) ? file.debtors.length : 0;
    const additional = Array.isArray(file.party_multiplicity?.additionalDebtors)
        ? file.party_multiplicity!.additionalDebtors!.length
        : 0;
    return Math.max(primary, 0) + Math.max(additional, 0);
}

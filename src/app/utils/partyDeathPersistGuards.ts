/** حفظ حقول وفاة/إحلال الخصوم عند دمج لقطات التخزين */
import type { ExecutionFile } from '@/app/types/execution';

const DEATH_TOP_KEYS = [
    'is_creditor_deceased',
    'is_debtor_deceased',
    'creditor_party_death_case',
    'debtor_party_death_case',
    'party_death_case',
] as const;

type PartyDeathish = {
    id?: unknown;
    isDeceased?: boolean;
    deceasedAt?: string;
    heirs?: unknown[];
    heirs_details?: unknown[];
    heirsDetails?: unknown[];
};

export function recordHasPartyDeathMarkers(
    file: Record<string, unknown> | null | undefined,
): boolean {
    if (!file) return false;
    if (DEATH_TOP_KEYS.some((k) => Boolean(file[k]))) return true;
    const creditors = Array.isArray(file.creditors) ? file.creditors : [];
    const debtors = Array.isArray(file.debtors) ? file.debtors : [];
    return [...creditors, ...debtors].some((p) => Boolean((p as PartyDeathish)?.isDeceased));
}

const mergeOnePartyDeath = (target: PartyDeathish, source: PartyDeathish): PartyDeathish => {
    if (!source.isDeceased && !target.isDeceased) return target;
    const heirs =
        (Array.isArray(target.heirs) && target.heirs.length > 0
            ? target.heirs
            : Array.isArray(source.heirs)
              ? source.heirs
              : target.heirs) ?? [];
    const heirs_details =
        (Array.isArray(target.heirs_details) && target.heirs_details.length > 0
            ? target.heirs_details
            : Array.isArray(source.heirs_details)
              ? source.heirs_details
              : target.heirs_details) ??
        (Array.isArray(target.heirsDetails) && target.heirsDetails.length > 0
            ? target.heirsDetails
            : Array.isArray(source.heirsDetails)
              ? source.heirsDetails
              : undefined);
    return {
        ...source,
        ...target,
        isDeceased: Boolean(target.isDeceased || source.isDeceased),
        deceasedAt: target.deceasedAt || source.deceasedAt,
        heirs,
        heirs_details,
        heirsDetails: heirs_details ?? target.heirsDetails ?? source.heirsDetails,
    };
};

const mergePartyListDeath = (targetList: unknown, sourceList: unknown): unknown => {
    if (!Array.isArray(sourceList) || sourceList.length === 0) return targetList;
    if (!Array.isArray(targetList) || targetList.length === 0) return sourceList;
    const byId = new Map<string, PartyDeathish>();
    for (const row of sourceList) {
        if (!row || typeof row !== 'object') continue;
        const p = row as PartyDeathish;
        const id = String(p.id ?? '').trim();
        if (id) byId.set(id, p);
    }
    return targetList.map((row, idx) => {
        if (!row || typeof row !== 'object') return row;
        const p = row as PartyDeathish;
        const id = String(p.id ?? '').trim();
        const src = (id && byId.get(id)) || (sourceList[idx] as PartyDeathish | undefined);
        if (!src) return row;
        return mergeOnePartyDeath(p, src);
    });
};

/**
 * إن كانت اللقطة الجديدة بلا وفاة بينما المصدر (ref/blob) يحملها — أعد حقن الحقول.
 * يمنع SaveOnUnmount من مسح وفاة محفوظة عبر React state متأخر.
 */
export function preservePartyDeathFromSource<T extends Record<string, unknown>>(
    snapshot: T,
    source: Record<string, unknown> | null | undefined,
): T {
    if (!source || !recordHasPartyDeathMarkers(source)) return snapshot;
    if (recordHasPartyDeathMarkers(snapshot)) {
        return {
            ...snapshot,
            creditors: mergePartyListDeath(snapshot.creditors, source.creditors),
            debtors: mergePartyListDeath(snapshot.debtors, source.debtors),
        } as T;
    }
    const next: Record<string, unknown> = { ...snapshot };
    for (const key of DEATH_TOP_KEYS) {
        if (source[key] != null) next[key] = source[key];
    }
    next.creditors = mergePartyListDeath(snapshot.creditors, source.creditors);
    next.debtors = mergePartyListDeath(snapshot.debtors, source.debtors);
    return next as T;
}

export function pickFresherExecutionBase(
    reactData: ExecutionFile | null | undefined,
    refData: ExecutionFile | null | undefined,
): ExecutionFile | null {
    if (!reactData && !refData) return null;
    if (!reactData) return refData ?? null;
    if (!refData) return reactData;
    if (String(reactData.id ?? '') !== String(refData.id ?? '')) return reactData;
    const reactMs = Date.parse(String(reactData.updatedAt ?? '')) || 0;
    const refMs = Date.parse(String(refData.updatedAt ?? '')) || 0;
    if (refMs > reactMs) return refData;
    if (reactMs > refMs) return reactData;
    if (
        recordHasPartyDeathMarkers(refData as unknown as Record<string, unknown>) &&
        !recordHasPartyDeathMarkers(reactData as unknown as Record<string, unknown>)
    ) {
        return refData;
    }
    return reactData;
}

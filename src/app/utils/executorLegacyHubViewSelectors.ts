type ExecutorLegacyHubRow = Record<string, unknown>;

export type SeizureRequestTargetLegacy = 'debtor' | 'guarantor';

function asTrimmed(value: unknown): string {
    return String(value ?? '').trim();
}

function hubDecisionRowSortKey(row: ExecutorLegacyHubRow): string {
    return asTrimmed(row.resolvedAt ?? row.date);
}

function sortHubDecisionRowsNewestFirst(rows: ExecutorLegacyHubRow[]): ExecutorLegacyHubRow[] {
    return [...rows].sort((a, b) =>
        hubDecisionRowSortKey(b).localeCompare(hubDecisionRowSortKey(a), undefined, {
            numeric: true,
        }),
    );
}

function isHubRow(row: ExecutorLegacyHubRow | null | undefined): boolean {
    if (!row) return false;
    return asTrimmed(row.appealSourceDecisionId) === '';
}

export function readSeizureRequestTargetFromRow(
    row: ExecutorLegacyHubRow | null | undefined,
): SeizureRequestTargetLegacy {
    if (!row) return 'debtor';
    const direct = asTrimmed(row.seizureTarget);
    if (direct === 'guarantor' || direct === 'debtor') return direct;

    const rawJson = asTrimmed(row.seizurePayloadJson);
    if (rawJson) {
        try {
            const payload = JSON.parse(rawJson) as { seizureTarget?: string };
            if (payload?.seizureTarget === 'guarantor') return 'guarantor';
            if (payload?.seizureTarget === 'debtor') return 'debtor';
        } catch {
            /* ignore */
        }
    }

    const text = `${String(row.title ?? '')}\n${String(row.body ?? '')}`;
    if (/الكفيل|كفيل|الضامن/i.test(text) && /حجز/i.test(text)) return 'guarantor';
    return 'debtor';
}

export function getLatestSeizureDecisionBySubtypeFromRows(
    rows: ExecutorLegacyHubRow[],
    subtype: string,
): ExecutorLegacyHubRow | null {
    const targetSubtype = asTrimmed(subtype);
    const filtered = rows.filter(
        (row) => asTrimmed(row.requestKind) === 'seizure' && asTrimmed(row.seizureSubtype) === targetSubtype,
    );
    if (filtered.length === 0) return null;
    const [first] = filtered;
    if (!first) return null;
    return filtered.reduce((best, current) => {
        const bestKey = hubDecisionRowSortKey(best);
        const currentKey = hubDecisionRowSortKey(current);
        return currentKey.localeCompare(bestKey, undefined, { numeric: true }) > 0
            ? current
            : best;
    }, first);
}

export function listSeizureHubRowsFromRows(
    rows: ExecutorLegacyHubRow[],
    subtype: string,
): ExecutorLegacyHubRow[] {
    const targetSubtype = asTrimmed(subtype);
    return sortHubDecisionRowsNewestFirst(
        rows.filter(
            (row) =>
                asTrimmed(row.requestKind) === 'seizure' &&
                isHubRow(row) &&
                asTrimmed(row.seizureSubtype) === targetSubtype,
        ),
    );
}

export function listGuarantorHubRowsFromRows(
    rows: ExecutorLegacyHubRow[],
): ExecutorLegacyHubRow[] {
    return sortHubDecisionRowsNewestFirst(
        rows.filter(
            (row) => asTrimmed(row.requestKind) === 'guarantor_request' && isHubRow(row),
        ),
    );
}

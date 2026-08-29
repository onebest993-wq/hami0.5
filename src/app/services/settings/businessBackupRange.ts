import type { BusinessBackupSelection } from './businessBackupTypes';

function parseRange(from: string, to: string) {
    const fromDate = from ? new Date(`${from}T00:00:00`) : null;
    const toDate = to ? new Date(`${to}T23:59:59`) : null;
    return {
        from: fromDate && !Number.isNaN(fromDate.getTime()) ? fromDate : null,
        to: toDate && !Number.isNaN(toDate.getTime()) ? toDate : null,
    };
}

export function extractDate(v: unknown): Date | null {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const obj = v as Record<string, unknown>;
    const candidates: unknown[] = [
        obj.createdAt,
        obj.updatedAt,
        obj.created_at,
        obj.updated_at,
        obj.date,
        obj.filingDate,
        obj.filing_date,
        obj.requestDate,
        obj.sessionDate,
        obj.nextSessionDate,
        obj.decisionDate,
    ];
    for (const c of candidates) {
        if (typeof c === 'number') {
            const d = new Date(c);
            if (!Number.isNaN(d.getTime())) return d;
        }
        if (typeof c === 'string' && c.trim()) {
            const d = new Date(c);
            if (!Number.isNaN(d.getTime())) return d;
        }
    }
    return null;
}

export function filterByRange(items: unknown[], selection: BusinessBackupSelection) {
    const { from, to } = parseRange(selection.from, selection.to);
    if (!from && !to) return { filtered: items, undated: 0 };
    let undated = 0;
    const filtered = items.filter((it) => {
        const d = extractDate(it);
        if (!d) {
            undated += 1;
            return selection.includeUndated;
        }
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
    });
    return { filtered, undated };
}

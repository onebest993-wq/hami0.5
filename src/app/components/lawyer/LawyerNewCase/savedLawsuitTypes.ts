const STORAGE_KEY = 'hami:lawyer:saved-lawsuit-types:v1';
const MAX_SAVED_TYPES = 20;

export function normalizeSavedLawsuitType(raw: string): string {
    return String(raw ?? '').replace(/\s+/g, ' ').trim();
}

function readRawList(): string[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        const seen = new Set<string>();
        const out: string[] = [];
        for (const item of parsed) {
            const label = normalizeSavedLawsuitType(String(item ?? ''));
            if (!label || seen.has(label)) continue;
            seen.add(label);
            out.push(label);
            if (out.length >= MAX_SAVED_TYPES) break;
        }
        return out;
    } catch {
        return [];
    }
}

export function readSavedLawsuitTypes(): string[] {
    return readRawList();
}

export function persistSavedLawsuitType(raw: string): string[] {
    const label = normalizeSavedLawsuitType(raw);
    if (!label) return readRawList();
    const next = [label, ...readRawList().filter((item) => item !== label)].slice(0, MAX_SAVED_TYPES);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        return next;
    }
    return next;
}

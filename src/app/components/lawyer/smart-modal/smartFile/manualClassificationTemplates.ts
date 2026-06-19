const STORAGE_KEY = 'hami:manual-classification-templates';
const MAX_TEMPLATES = 24;
const MAX_TAG_LENGTH = 48;

export function normalizeManualClassificationTag(raw: string): string {
    const trimmed = String(raw ?? '').replace(/\s+/g, ' ').trim();
    if (!trimmed) return '';
    const withoutHash = trimmed.replace(/^#+/, '');
    if (!withoutHash) return '';
    const tag = `#${withoutHash}`;
    return tag.length > MAX_TAG_LENGTH + 1 ? tag.slice(0, MAX_TAG_LENGTH + 1) : tag;
}

export function loadManualClassificationTemplates(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        const seen = new Set<string>();
        const out: string[] = [];
        for (const item of parsed) {
            const normalized = normalizeManualClassificationTag(String(item));
            if (!normalized || seen.has(normalized)) continue;
            seen.add(normalized);
            out.push(normalized);
            if (out.length >= MAX_TEMPLATES) break;
        }
        return out;
    } catch {
        return [];
    }
}

export function persistManualClassificationTemplates(templates: string[]): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(templates.slice(0, MAX_TEMPLATES)));
    } catch {
        /* ignore quota errors */
    }
}

export function addManualClassificationTemplate(templates: string[], text: string): string[] {
    const normalized = normalizeManualClassificationTag(text);
    if (!normalized) return templates;
    const withoutDup = templates.filter((t) => t !== normalized);
    return [normalized, ...withoutDup].slice(0, MAX_TEMPLATES);
}

export function removeManualClassificationTemplate(templates: string[], text: string): string[] {
    const normalized = normalizeManualClassificationTag(text);
    return templates.filter((t) => t !== normalized);
}

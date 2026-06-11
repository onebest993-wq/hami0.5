const STORAGE_KEY = 'hami:smartvault:custom-categories:v1';

function storageKey(userId: string): string {
    return `${STORAGE_KEY}:${userId.trim()}`;
}

export function loadCustomCategories(userId: string): string[] {
    if (!userId.trim()) return [];
    try {
        const raw = localStorage.getItem(storageKey(userId));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    } catch {
        return [];
    }
}

export function saveCustomCategories(userId: string, categories: string[]): void {
    if (!userId.trim()) return;
    const unique = Array.from(new Set(categories.map((c) => c.trim()).filter(Boolean)));
    localStorage.setItem(storageKey(userId), JSON.stringify(unique));
}

export function addCustomCategory(userId: string, name: string): string[] {
    const trimmed = name.trim();
    if (!trimmed) return loadCustomCategories(userId);
    const existing = loadCustomCategories(userId);
    if (existing.includes(trimmed)) return existing;
    const next = [...existing, trimmed];
    saveCustomCategories(userId, next);
    return next;
}

/** دمج تصنيفات محفوظة مع تصنيفات الملفات الفعلية (customCategory فقط) */
export function mergeCustomCategoriesFromDocs(
    userId: string,
    docs: { customCategory?: string | null }[],
): string[] {
    if (!userId.trim()) return [];
    const fromDocs = docs.map((d) => d.customCategory?.trim() || '').filter(Boolean);
    const existing = loadCustomCategories(userId);
    const merged = Array.from(new Set([...existing, ...fromDocs]));
    if (merged.length !== existing.length) saveCustomCategories(userId, merged);
    return merged;
}

export function removeCustomCategory(userId: string, name: string): string[] {
    const next = loadCustomCategories(userId).filter((c) => c !== name);
    saveCustomCategories(userId, next);
    return next;
}

export function docMatchesCategoryFilter(doc: { customCategory?: string | null }, filter: string): boolean {
    if (filter === 'الكل') return true;
    return (doc.customCategory?.trim() || '') === filter;
}

export function countDocsInCategory(
    docs: { customCategory?: string | null }[],
    filter: string,
): number {
    if (filter === 'الكل') return docs.length;
    return docs.filter((d) => docMatchesCategoryFilter(d, filter)).length;
}

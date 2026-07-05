const STORAGE_KEY = 'hami:smartvault:custom-categories:v1';
const BLOCKED_CUSTOM_CATEGORIES = new Set(['المنتدى']);
const PRIORITIZED_VISIBLE_CATEGORIES = ['PDF', 'صورة', 'تسجيل صوتي'] as const;

function sanitizeCategoryName(name: string): string {
    return name.trim();
}

function isVisibleCustomCategory(name: string): boolean {
    const normalized = sanitizeCategoryName(name);
    return normalized.length > 0 && !BLOCKED_CUSTOM_CATEGORIES.has(normalized);
}

export function getVisibleVaultCustomCategories(categories: string[]): string[] {
    const sanitized = Array.from(
        new Set(categories.map(sanitizeCategoryName).filter(isVisibleCustomCategory)),
    );

    const indexByPriority = new Map<string, number>(
        PRIORITIZED_VISIBLE_CATEGORIES.map((name, index) => [name, index]),
    );

    return sanitized.sort((a, b) => {
        const aPriority = indexByPriority.get(a);
        const bPriority = indexByPriority.get(b);
        if (aPriority != null && bPriority != null) return aPriority - bPriority;
        if (aPriority != null) return -1;
        if (bPriority != null) return 1;
        return categories.indexOf(a) - categories.indexOf(b);
    });
}

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
        return getVisibleVaultCustomCategories(
            parsed.filter((v): v is string => typeof v === 'string'),
        );
    } catch {
        return [];
    }
}

export function saveCustomCategories(userId: string, categories: string[]): void {
    if (!userId.trim()) return;
    const unique = getVisibleVaultCustomCategories(categories);
    localStorage.setItem(storageKey(userId), JSON.stringify(unique));
}

export function addCustomCategory(userId: string, name: string): string[] {
    const trimmed = sanitizeCategoryName(name);
    if (!trimmed) return loadCustomCategories(userId);
    if (!isVisibleCustomCategory(trimmed)) return loadCustomCategories(userId);
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
    const fromDocs = docs
        .map((d) => d.customCategory?.trim() || '')
        .filter(isVisibleCustomCategory);
    const existing = loadCustomCategories(userId);
    const merged = getVisibleVaultCustomCategories([...existing, ...fromDocs]);
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

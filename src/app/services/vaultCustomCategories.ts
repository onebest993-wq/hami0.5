import { readSecureJsonRawSync, writeSecureJsonValue } from '@/app/services/storage/syncSecureJson';

const STORAGE_KEY = 'hami:smartvault:custom-categories:v1';
const BLOCKED_CUSTOM_CATEGORIES = new Set(['المنتدى']);

/** تصنيفات أزرار المستودع — التسمية الصحيحة الثابتة */
export const REPOSITORY_ACTION_CATEGORY = {
    note: 'مسودة',
    scan: 'مسح',
    image: 'صورة',
    pdf: 'PDF',
    voice: 'تسجيل صوتي',
} as const;

export type RepositoryActionCategoryKey = keyof typeof REPOSITORY_ACTION_CATEGORY;

export const PRIORITIZED_VISIBLE_CATEGORIES = [
    REPOSITORY_ACTION_CATEGORY.note,
    REPOSITORY_ACTION_CATEGORY.scan,
    REPOSITORY_ACTION_CATEGORY.image,
    REPOSITORY_ACTION_CATEGORY.pdf,
    REPOSITORY_ACTION_CATEGORY.voice,
] as const;

const ACTION_CATEGORY_SET = new Set<string>(PRIORITIZED_VISIBLE_CATEGORIES);

/** تصنيفات أزرار المستودع فقط — لا دمج ولا تصنيفات دخيلة */
export function isRepositoryActionCategory(name: string): boolean {
    const trimmed = name.trim();
    if (ACTION_CATEGORY_SET.has(trimmed)) return true;
    return trimmed === 'بطاقة'; // توافق قديم → مسودة
}

export function listRepositoryActionCategoriesWithContent(
    docs: { customCategory?: string | null }[],
    notes: NoteCategorySource[],
    activeFilter?: string,
): string[] {
    return PRIORITIZED_VISIBLE_CATEGORIES.filter(
        (category) =>
            countRepositoryCategoryItems(docs, notes, category) > 0 ||
            activeFilter === category ||
            (category === REPOSITORY_ACTION_CATEGORY.note && activeFilter === 'بطاقة'),
    );
}

export function defaultCategoryForVaultUploadKind(kind: 'image' | 'pdf'): string {
    return kind === 'pdf' ? REPOSITORY_ACTION_CATEGORY.pdf : REPOSITORY_ACTION_CATEGORY.image;
}

/** توافق مع التصنيف القديم «بطاقة» بعد إعادة التسمية إلى «مسودة» */
export function categoryMatchesName(value: string | null | undefined, filter: string): boolean {
    const trimmed = (value ?? '').trim();
    if (!trimmed || !filter || filter === 'الكل') return filter === 'الكل';
    if (trimmed === filter) return true;
    if (filter === REPOSITORY_ACTION_CATEGORY.note && trimmed === 'بطاقة') return true;
    if (filter === 'بطاقة' && trimmed === REPOSITORY_ACTION_CATEGORY.note) return true;
    return false;
}

type NoteCategorySource = {
    tags?: string[] | null;
    type?: string | null;
    attachmentDocId?: string | null;
    body?: string | null;
};

function noteHasExplicitActionTag(note: NoteCategorySource): boolean {
    return (note.tags ?? []).some((t) => isRepositoryActionCategory(t));
}

/** مطابقة الملاحظة لتصنيف زر — مع استدلال للمسودات/التسجيل بلا وسم قديم */
export function noteMatchesRepositoryActionCategory(
    note: NoteCategorySource,
    category: string,
): boolean {
    const normalized = sanitizeCategoryName(category);
    if ((note.tags ?? []).some((t) => categoryMatchesName(t, normalized))) return true;

    const voice =
        note.type === 'voice' ||
        (typeof note.body === 'string' && note.body.includes('hami-voice:'));

    if (normalized === REPOSITORY_ACTION_CATEGORY.voice) return voice;
    if (normalized === REPOSITORY_ACTION_CATEGORY.note) {
        if (voice) return false;
        // مسودة قديمة بلا وسم — تُحسب مسودة ما لم تحمل تصنيفاً صريحاً آخر
        return !noteHasExplicitActionTag(note);
    }
    return false;
}

export function countRepositoryCategoryItems(
    docs: { customCategory?: string | null }[],
    notes: NoteCategorySource[],
    category: string,
): number {
    if (category === 'الكل') return docs.length + notes.length;
    const fromDocs = docs.filter((d) => categoryMatchesName(d.customCategory, category)).length;
    const fromNotes = notes.filter((n) => noteMatchesRepositoryActionCategory(n, category)).length;
    return fromDocs + fromNotes;
}


function sanitizeCategoryName(name: string): string {
    const stripped = name.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (stripped === 'بطاقة') return REPOSITORY_ACTION_CATEGORY.note;
    return stripped;
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
        const raw = readSecureJsonRawSync(storageKey(userId));
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
    writeSecureJsonValue(storageKey(userId), unique);
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
    return categoryMatchesName(doc.customCategory, filter);
}

export function countDocsInCategory(
    docs: { customCategory?: string | null }[],
    filter: string,
): number {
    if (filter === 'الكل') return docs.length;
    return docs.filter((d) => docMatchesCategoryFilter(d, filter)).length;
}

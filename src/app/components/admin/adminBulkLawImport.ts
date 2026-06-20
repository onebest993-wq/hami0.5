// @ts-nocheck
export type BulkLawInvokeRow = {
    law_name: string;
    article_number: string;
    content: string;
};

export type BulkLawParseResult =
    | {
          ok: true;
          rawCount: number;
          items: BulkLawInvokeRow[];
          skipped: Array<{ index: number; reason: string }>;
      }
    | { ok: false; error: string };

const ARTICLE_FIELD_KEYS = [
    'article_number',
    'articleNumber',
    'ArticleNumber',
    'article',
    'Article',
    'المادة',
    'الماده',
    'مادة',
    'رقم_المادة',
    'رقم المادة',
    'نص_المادة',
    'number',
    'num',
    'no',
    'رقم',
    'id',
    'key',
] as const;

const CONTENT_FIELD_KEYS = [
    'content',
    'text',
    'body',
    'النص',
    'النص الكامل',
    'نص',
    'نص المادة',
    'نص_المادة',
    'المحتوى',
    'محتوى',
    'description',
    'content_text',
    'full_text',
    'value',
    'paragraph',
] as const;

const BUNDLE_META_KEYS = new Set([
    'schemaVersion',
    'schema_version',
    'law_name',
    'lawName',
    'articles',
    'data',
    'law',
    'metadata',
    'meta',
]);

const NESTED_ARTICLE_CONTAINERS: readonly (readonly string[])[] = [
    ['articles'],
    ['data', 'articles'],
    ['law', 'articles'],
    ['payload', 'articles'],
    ['items'],
    ['rows'],
    ['records'],
    ['مواد'],
    ['قانون', 'مواد'],
];

/** يقبل article_number كنص أو رقم (مثل 1 أو "المادة 1"). */
export function normalizeBulkArticleNumber(raw: unknown): string {
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return '';
        const match = trimmed.match(/(?:المادة|مادة|article)\s*[:#-]?\s*([0-9\u0660-\u0669]+)/i);
        if (match?.[1]) return match[1];
        return trimmed;
    }
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return String(Math.trunc(raw));
    }
    return '';
}

export function normalizeBulkContent(raw: unknown): string {
    if (typeof raw === 'string') return raw.trim();
    if (Array.isArray(raw)) {
        return raw
            .map((part) => normalizeBulkContent(part))
            .filter(Boolean)
            .join('\n');
    }
    if (raw && typeof raw === 'object') {
        const record = raw as Record<string, unknown>;
        for (const key of CONTENT_FIELD_KEYS) {
            const nested = normalizeBulkContent(record[key]);
            if (nested) return nested;
        }
    }
    return '';
}

function normalizeFieldKey(key: string): string {
    return key
        .trim()
        .toLowerCase()
        .replace(/[\s_\-]/g, '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي');
}

function pickFirstRowField(row: Record<string, unknown>, keys: readonly string[]): unknown {
    for (const key of keys) {
        if (!Object.prototype.hasOwnProperty.call(row, key)) continue;
        const value = row[key];
        if (value !== undefined && value !== null) return value;
    }

    const normalizedTargets = new Set(keys.map((key) => normalizeFieldKey(key)));
    for (const [key, value] of Object.entries(row)) {
        if (value === undefined || value === null) continue;
        const normalizedKey = normalizeFieldKey(key);
        if (normalizedTargets.has(normalizedKey)) return value;
        if (
            normalizedKey.includes('ماده')
            || normalizedKey.includes('article')
            || normalizedKey.includes('رقمالماده')
        ) {
            if (typeof value === 'string' || typeof value === 'number') return value;
        }
        if (
            normalizedKey.includes('نص')
            || normalizedKey.includes('content')
            || normalizedKey.includes('text')
            || normalizedKey.includes('محتو')
        ) {
            return value;
        }
    }
    return undefined;
}

export function extractBulkArticleNumber(row: Record<string, unknown>): string {
    const direct = normalizeBulkArticleNumber(pickFirstRowField(row, ARTICLE_FIELD_KEYS));
    if (direct) return direct;

    const keys = Object.keys(row);
    if (keys.length === 1) {
        return normalizeBulkArticleNumber(keys[0]);
    }
    return '';
}

export function extractBulkContent(row: Record<string, unknown>): string {
    return normalizeBulkContent(pickFirstRowField(row, CONTENT_FIELD_KEYS));
}

function rowFromArticleMapEntry(key: string, value: unknown): Record<string, unknown> | null {
    if (typeof value === 'string') {
        return { article_number: key, content: value };
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const row = value as Record<string, unknown>;
        if (!extractBulkArticleNumber(row)) {
            return { article_number: key, ...row };
        }
        return row;
    }
    return null;
}

function articlesObjectToRows(articlesObj: Record<string, unknown>): unknown[] {
    const rows: unknown[] = [];
    for (const [key, value] of Object.entries(articlesObj)) {
        const row = rowFromArticleMapEntry(key, value);
        if (row) rows.push(row);
    }
    return rows;
}

function digNestedArticles(node: unknown, pathIndex = 0): unknown[] | null {
    if (pathIndex >= NESTED_ARTICLE_CONTAINERS.length) return null;
    if (!node || typeof node !== 'object') return null;

    for (let i = pathIndex; i < NESTED_ARTICLE_CONTAINERS.length; i++) {
        const path = NESTED_ARTICLE_CONTAINERS[i];
        let current: unknown = node;
        let found = true;
        for (const segment of path) {
            if (!current || typeof current !== 'object' || Array.isArray(current)) {
                found = false;
                break;
            }
            current = (current as Record<string, unknown>)[segment];
        }
        if (!found || current === undefined || current === null) continue;
        if (Array.isArray(current)) return current;
        if (typeof current === 'object') {
            return articlesObjectToRows(current as Record<string, unknown>);
        }
    }
    return null;
}

/** يفكّ Array مباشر أو حزمة { articles: [...] } أو خريطة { "1": "نص" }. */
export function unwrapBulkLawJsonRows(parsed: unknown): unknown[] {
    if (Array.isArray(parsed)) return parsed;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return [];
    }

    const root = parsed as Record<string, unknown>;
    const nested = digNestedArticles(root);
    if (nested && nested.length > 0) return nested;

    if (root.articles && typeof root.articles === 'object' && !Array.isArray(root.articles)) {
        const fromArticlesObject = articlesObjectToRows(root.articles as Record<string, unknown>);
        if (fromArticlesObject.length > 0) return fromArticlesObject;
    }

    const mapKeys = Object.keys(root).filter((key) => !BUNDLE_META_KEYS.has(key));
    if (mapKeys.length === 0) return [];

    const rows: Record<string, unknown>[] = [];
    for (const key of mapKeys) {
        const row = rowFromArticleMapEntry(key, root[key]);
        if (row) rows.push(row);
    }
    return rows;
}

function describeBulkRowValidationFailure(
    index: number,
    lawName: string,
    articleNumber: string,
    bodyContent: string,
): string {
    const missing: string[] = [];
    if (!lawName) missing.push('اختيار القسم القانوني');
    if (!articleNumber) missing.push('article_number أو «المادة»');
    if (!bodyContent) missing.push('content أو «النص»');
    return `العنصر ${index + 1}: ${missing.join(' · ')}`;
}

export function parseBulkLawJsonInput(
    parsed: unknown,
    lawName: string,
): BulkLawParseResult {
    const trimmedLawName = String(lawName ?? '').trim();
    if (!trimmedLawName) {
        return { ok: false, error: 'اختر القسم القانوني قبل الرفع الجماعي.' };
    }

    const rawRows = unwrapBulkLawJsonRows(parsed);
    if (rawRows.length === 0) {
        return {
            ok: false,
            error:
                'أدخل مصفوفة JSON أو حزمة { "articles": [...] } تحتوي مادة واحدة على الأقل.',
        };
    }

    const items: BulkLawInvokeRow[] = [];
    const skipped: Array<{ index: number; reason: string }> = [];

    for (let i = 0; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            skipped.push({ index: i + 1, reason: 'ليس كائناً صالحاً' });
            continue;
        }

        const record = row as Record<string, unknown>;
        const article_number = extractBulkArticleNumber(record);
        const content = extractBulkContent(record);

        if (!article_number || !content) {
            skipped.push({
                index: i + 1,
                reason: describeBulkRowValidationFailure(
                    i,
                    trimmedLawName,
                    article_number,
                    content,
                ),
            });
            continue;
        }

        items.push({
            law_name: trimmedLawName,
            article_number,
            content,
        });
    }

    if (items.length === 0) {
        const firstSkip = skipped[0]?.reason ?? 'لا توجد مواد صالحة.';
        return {
            ok: false,
            error: `لم يُقبل أي عنصر (${rawRows.length} في الملف). ${firstSkip}`,
        };
    }

    return {
        ok: true,
        rawCount: rawRows.length,
        items,
        skipped,
    };
}

export function parseBulkLawJsonText(jsonText: string, lawName: string): BulkLawParseResult {
    const trimmed = String(jsonText ?? '').trim();
    if (!trimmed) {
        return { ok: false, error: 'الصق JSON أو ارفع ملف .json.' };
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(trimmed);
    } catch {
        return { ok: false, error: 'صيغة JSON غير صحيحة. تأكد من أن النص JSON صالح.' };
    }
    return parseBulkLawJsonInput(parsed, lawName);
}

export function summarizeBulkLawParse(result: BulkLawParseResult): string | null {
    if (!result.ok) return result.error;
    if (result.skipped.length === 0) {
        return `جاهز للرفع: ${result.items.length} مادة (${result.rawCount} في الملف).`;
    }
    return `جاهز للرفع: ${result.items.length} صالح من ${result.rawCount} في الملف — تخطّي ${result.skipped.length}.`;
}

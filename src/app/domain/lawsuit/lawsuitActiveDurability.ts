import type { FileData } from './lawsuitFileTypes';

/** معرّفات صفوف نشطة من JSON خام */
export function parseLawsuitActiveIds(raw: string | null | undefined): Set<string> {
    if (!raw) return new Set();
    try {
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed)) return new Set();
        return new Set(
            parsed
                .map((row) =>
                    row && typeof row === 'object' && 'id' in row
                        ? String((row as { id: unknown }).id)
                        : '',
                )
                .filter(Boolean),
        );
    } catch {
        return new Set();
    }
}

export function lawsuitActiveIdSet(files: readonly FileData[]): Set<string> {
    return new Set(files.map((f) => String(f.id)).filter(Boolean));
}

/** هل المقترح أفقر من الموجود (يفقد معرّفات)؟ */
export function isPoorerLawsuitActiveList(
    proposed: readonly FileData[],
    existing: readonly FileData[],
): boolean {
    if (existing.length === 0) return false;
    if (proposed.length === 0 && existing.length > 0) return true;
    const prop = lawsuitActiveIdSet(proposed);
    for (const id of lawsuitActiveIdSet(existing)) {
        if (!prop.has(id)) return true;
    }
    return false;
}

/**
 * ادمج بحيث لا تُفقد إضبارات موجودة عند كتابة قائمة أقصر (hydrate ناقص / إنشاء).
 * صفوف `proposed` تفوز عند تعارض نفس الـ id.
 */
export function mergeRicherLawsuitActive(
    proposed: readonly FileData[],
    existing: readonly FileData[],
): FileData[] {
    if (existing.length === 0) return [...proposed];
    if (proposed.length === 0) return [...existing];
    const byId = new Map<string, FileData>();
    for (const row of existing) {
        const id = String(row.id);
        if (id) byId.set(id, row);
    }
    for (const row of proposed) {
        const id = String(row.id);
        if (id) byId.set(id, row);
    }
    /* ترتيب: المقترح أولاً ثم الباقي من الموجود */
    const out: FileData[] = [];
    const seen = new Set<string>();
    for (const row of proposed) {
        const id = String(row.id);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(byId.get(id) ?? row);
    }
    for (const row of existing) {
        const id = String(row.id);
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(row);
    }
    return out;
}

export function parseLawsuitActiveFiles(raw: string | null | undefined): FileData[] {
    if (!raw) return [];
    try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as FileData[]) : [];
    } catch {
        return [];
    }
}

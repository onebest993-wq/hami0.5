import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { djb2Hash } from '@/app/utils/djb2';

const MAX_FILE_SLICES = 2_500;

type FileSlice = {
    sig: string;
    entries: GlobalSearchEntry[];
};

const fileSliceCache = new Map<string, FileSlice>();

/** هاش لمحتوى الأطراف — يلتقط تعديل الاسم/الهاتف/الدور (مصدر عنوان النتيجة) */
function partiesContentHash(parties: FileData['parties']): number {
    if (!Array.isArray(parties) || parties.length === 0) return 0;
    const blob = parties
        .map((p) => `${p.id ?? ''}:${p.name ?? ''}:${p.phone ?? ''}:${p.role ?? ''}:${p.isClient ? 1 : 0}`)
        .join('|');
    return djb2Hash(blob);
}

/** هاش لنصوص ملاحظات الملف */
function notesContentHash(notes: FileData['notes']): number {
    if (!Array.isArray(notes) || notes.length === 0) return 0;
    return djb2Hash(notes.map((n) => `${n.id ?? ''}:${n.text ?? ''}`).join('|'));
}

/** هاش لعناوين/تفاصيل المهام */
function tasksContentHash(tasks: FileData['tasks']): number {
    if (!Array.isArray(tasks) || tasks.length === 0) return 0;
    return djb2Hash(
        tasks
            .map((t) => {
                const rec = t as { id?: unknown; title?: unknown; text?: unknown; details?: unknown };
                return `${String(rec.id ?? '')}:${String(rec.title ?? rec.text ?? '')}:${String(rec.details ?? '')}`;
            })
            .join('|'),
    );
}

/** هاش مضغوط لمحتوى المراحل (timeline / tasks / incidentals) — يلتقط تعديل الأحداث */
function stagesContentHash(stagesRaw: unknown): number {
    if (!Array.isArray(stagesRaw) || stagesRaw.length === 0) return 0;
    const parts: string[] = [];
    for (const stageRaw of stagesRaw) {
        if (!stageRaw || typeof stageRaw !== 'object') continue;
        const stage = stageRaw as Record<string, unknown>;
        parts.push(String(stage.id ?? ''), String(stage.stageName ?? stage.name ?? ''));
        const timeline = Array.isArray(stage.timeline) ? stage.timeline : [];
        for (const evRaw of timeline) {
            if (!evRaw || typeof evRaw !== 'object') continue;
            const ev = evRaw as Record<string, unknown>;
            parts.push(
                `e${String(ev.id ?? '')}:${String(ev.title ?? '')}:${String(ev.details ?? '')}:${ev.isDeleted ? 1 : 0}`,
            );
        }
        const stageTasks = Array.isArray(stage.tasks) ? stage.tasks : [];
        for (const tRaw of stageTasks) {
            if (!tRaw || typeof tRaw !== 'object') continue;
            const t = tRaw as Record<string, unknown>;
            parts.push(`t${String(t.id ?? '')}:${String(t.title ?? '')}`);
        }
        const incidentals = Array.isArray(stage.incidentalCases) ? stage.incidentalCases : [];
        for (const iRaw of incidentals) {
            if (!iRaw || typeof iRaw !== 'object') continue;
            const i = iRaw as Record<string, unknown>;
            parts.push(`i${String(i.id ?? '')}:${String(i.title ?? i.subject ?? '')}`);
        }
    }
    return djb2Hash(parts.join('|'));
}

export function fileSearchIndexSignature(f: FileData & { executionTrashDeletedAt?: string | null }): string {
    const id = String(f.id);
    const stagesRaw = (f as unknown as { stages?: unknown }).stages;
    return [
        id,
        f.type ?? '',
        f.status ?? '',
        f.caseNo ?? '',
        f.court ?? '',
        f.docType ?? '',
        f.judge ?? '',
        f.executionTrashDeletedAt ?? '',
        partiesContentHash(f.parties),
        notesContentHash(f.notes),
        tasksContentHash(f.tasks),
        stagesContentHash(stagesRaw),
    ].join('|');
}

export function getCachedFileSearchEntries(
    f: FileData & { executionTrashDeletedAt?: string | null },
): GlobalSearchEntry[] | null {
    const hit = fileSliceCache.get(String(f.id));
    if (!hit) return null;
    if (hit.sig !== fileSearchIndexSignature(f)) return null;
    return hit.entries;
}

export function rememberFileSearchEntries(
    f: FileData & { executionTrashDeletedAt?: string | null },
    entries: GlobalSearchEntry[],
): void {
    const id = String(f.id);
    fileSliceCache.set(id, { sig: fileSearchIndexSignature(f), entries });
    while (fileSliceCache.size > MAX_FILE_SLICES) {
        const oldest = fileSliceCache.keys().next().value;
        if (oldest === undefined) break;
        fileSliceCache.delete(oldest);
    }
}

export function invalidateFileSearchSliceCache(fileId?: string): void {
    if (fileId) {
        fileSliceCache.delete(String(fileId));
        return;
    }
    fileSliceCache.clear();
}

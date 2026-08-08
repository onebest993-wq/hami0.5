import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { isLawsuitArchived, isLawsuitInTrash } from '@/app/utils/lawsuitTrash';
import {
    buildLawsuitIndexSearchHaystack,
    resolveLawsuitIndexClientName,
} from './lawsuitIndexSearchHaystack';

export type LawsuitLifecycleStatus = 'active' | 'archived' | 'deleted';

export type LawsuitIndexEntry = {
    id: string;
    status: LawsuitLifecycleStatus;
    caseNo?: string;
    title?: string;
    type?: string;
    updatedAt?: number;
    court?: string;
    clientName?: string;
    /** أطراف + ملاحظات + محكمة — للبحث دون تحميل segment */
    searchHaystack?: string;
};

export type LawsuitLifecycleCounts = {
    active: number;
    archived: number;
    trash: number;
};

export type LawsuitLifecycleIndex = {
    v: 1;
    entries: Record<string, LawsuitIndexEntry>;
    counts: LawsuitLifecycleCounts;
};

export function emptyLawsuitLifecycleIndex(): LawsuitLifecycleIndex {
    return { v: 1, entries: {}, counts: { active: 0, archived: 0, trash: 0 } };
}

export function lawsuitStatusFromFile(file: FileData | { status?: string }): LawsuitLifecycleStatus {
    if (isLawsuitInTrash(file)) return 'deleted';
    if (isLawsuitArchived(file)) return 'archived';
    return 'active';
}

export function buildLawsuitIndexEntryFromFile(file: FileData): LawsuitIndexEntry {
    const id = String(file.id);
    const status = lawsuitStatusFromFile(file);
    const entry: LawsuitIndexEntry = { id, status };
    if (file.caseNo) entry.caseNo = String(file.caseNo);
    const title = (file as { title?: string }).title;
    if (title) entry.title = String(title);
    if (file.court) entry.court = String(file.court);
    const clientName = resolveLawsuitIndexClientName(file);
    if (clientName) entry.clientName = clientName;
    const haystack = buildLawsuitIndexSearchHaystack(file);
    if (haystack) entry.searchHaystack = haystack;
    if (file.type) entry.type = String(file.type);
    const updatedAt = (file as { updatedAt?: number }).updatedAt;
    if (typeof updatedAt === 'number' && Number.isFinite(updatedAt)) entry.updatedAt = updatedAt;
    return entry;
}

function recomputeCounts(entries: Record<string, LawsuitIndexEntry>): LawsuitLifecycleCounts {
    let active = 0;
    let archived = 0;
    let trash = 0;
    for (const entry of Object.values(entries)) {
        if (entry.status === 'deleted') trash += 1;
        else if (entry.status === 'archived') archived += 1;
        else active += 1;
    }
    return { active, archived, trash };
}

export function buildLawsuitLifecycleIndex(
    active: FileData[],
    archived: FileData[],
    trash: FileData[],
): LawsuitLifecycleIndex {
    const entries: Record<string, LawsuitIndexEntry> = {};
    const add = (file: FileData) => {
        const entry = buildLawsuitIndexEntryFromFile(file);
        entries[entry.id] = entry;
    };
    active.forEach(add);
    archived.forEach(add);
    trash.forEach(add);
    return { v: 1, entries, counts: recomputeCounts(entries) };
}

export function applyLawsuitIndexStatusChange(
    index: LawsuitLifecycleIndex,
    id: string,
    from: LawsuitLifecycleStatus | null,
    to: LawsuitLifecycleStatus,
    patch?: Partial<LawsuitIndexEntry>,
): LawsuitLifecycleIndex {
    const idStr = String(id);
    const prev = index.entries[idStr];
    const fromStatus = from ?? prev?.status ?? null;
    const patchSansStatus: Partial<LawsuitIndexEntry> = patch ? { ...patch } : {};
    delete patchSansStatus.id;
    delete patchSansStatus.status;
    const nextEntry: LawsuitIndexEntry = {
        ...prev,
        ...patchSansStatus,
        id: idStr,
        status: to,
    };
    const entries = { ...index.entries, [idStr]: nextEntry };
    const counts = { ...index.counts };
    if (fromStatus === 'active') counts.active = Math.max(0, counts.active - 1);
    else if (fromStatus === 'archived') counts.archived = Math.max(0, counts.archived - 1);
    else if (fromStatus === 'deleted') counts.trash = Math.max(0, counts.trash - 1);
    if (to === 'active') counts.active += 1;
    else if (to === 'archived') counts.archived += 1;
    else if (to === 'deleted') counts.trash += 1;
    return { v: 1, entries, counts };
}

export function removeLawsuitFromIndex(index: LawsuitLifecycleIndex, id: string | number): LawsuitLifecycleIndex {
    const idStr = String(id);
    const prev = index.entries[idStr];
    if (!prev) return index;
    const entries = { ...index.entries };
    delete entries[idStr];
    const counts = { ...index.counts };
    if (prev.status === 'active') counts.active = Math.max(0, counts.active - 1);
    else if (prev.status === 'archived') counts.archived = Math.max(0, counts.archived - 1);
    else if (prev.status === 'deleted') counts.trash = Math.max(0, counts.trash - 1);
    return { v: 1, entries, counts };
}

export function upsertLawsuitIndexEntry(
    index: LawsuitLifecycleIndex,
    file: FileData,
): LawsuitLifecycleIndex {
    const entry = buildLawsuitIndexEntryFromFile(file);
    const prev = index.entries[entry.id];
    if (prev?.status === entry.status) {
        const entries = { ...index.entries, [entry.id]: { ...prev, ...entry } };
        return { v: 1, entries, counts: index.counts };
    }
    return applyLawsuitIndexStatusChange(index, entry.id, prev?.status ?? null, entry.status, entry);
}

/** تحديث إدخالات النشطة فقط — يحافظ على مخزن/مهملات في الفهرس عند boot بدون تحميلهما */
export function rebuildActiveSegmentInIndex(
    index: LawsuitLifecycleIndex,
    active: FileData[],
): LawsuitLifecycleIndex {
    const entries: Record<string, LawsuitIndexEntry> = {};
    for (const [id, entry] of Object.entries(index.entries)) {
        if (entry.status !== 'active') entries[id] = entry;
    }
    for (const file of active) {
        const entry = buildLawsuitIndexEntryFromFile(file);
        entries[entry.id] = entry;
    }
    return { v: 1, entries, counts: recomputeCounts(entries) };
}

/** يُحدّث metadata البحث عند تحميل مخزن/مهملات لأول مرة */
export function enrichLifecycleIndexFromSegmentFiles(
    index: LawsuitLifecycleIndex,
    archived: FileData[] | null | undefined,
    trash: FileData[] | null | undefined,
): LawsuitLifecycleIndex {
    let next = index;
    const merge = (files: FileData[]) => {
        for (const file of files) {
            next = upsertLawsuitIndexEntry(next, file);
        }
    };
    if (archived) merge(archived);
    if (trash) merge(trash);
    return next;
}

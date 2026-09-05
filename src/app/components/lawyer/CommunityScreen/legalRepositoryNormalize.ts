import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { listRepositoryDocumentsSync } from '@/app/services/cloud/lawyerRepositoryCloud';
import { peekRepositoryDocsCache } from '@/app/services/forum/repositoryDocsWarmCache';
import { resolveRepositoryDocTags } from './repositoryTagUtils';

export function normalizeRepositoryRows(docs: RepositoryDocument[]): RepositoryDocument[] {
    return docs.map((doc) => ({
        ...doc,
        tags: resolveRepositoryDocTags(doc.title, doc.description, doc.tags),
    }));
}

/** `uploadDate` تاريخ بلا وقت — وحده لا يفرّق بين نسختين في اليوم نفسه. */
function repositoryDocRevisionTime(doc: RepositoryDocument): number {
    return Date.parse(doc.updatedAt ?? '') || Date.parse(doc.uploadDate) || 0;
}

export function mergeRepositoryDocumentsById(
    local: RepositoryDocument[],
    remote: RepositoryDocument[],
): RepositoryDocument[] {
    const map = new Map<string, RepositoryDocument>();
    for (const doc of local) map.set(doc.id, doc);
    for (const doc of remote) {
        const prev = map.get(doc.id);
        if (!prev) {
            map.set(doc.id, doc);
            continue;
        }
        // التعادل يرجّح المحلي — تعديل لم يبلغ الفهرس بعد يجب ألا يُمحى بنسخة قديمة.
        const isRemoteNewer = repositoryDocRevisionTime(doc) > repositoryDocRevisionTime(prev);
        map.set(doc.id, isRemoteNewer ? doc : prev);
    }
    return [...map.values()].sort(
        (a, b) => (Date.parse(b.uploadDate) || 0) - (Date.parse(a.uploadDate) || 0),
    );
}

export function resolveInitialRepositoryDocuments(): RepositoryDocument[] {
    const cached = peekRepositoryDocsCache();
    if (cached && cached.length > 0) {
        return normalizeRepositoryRows(cached);
    }
    const local = listRepositoryDocumentsSync();
    if (local.length > 0) {
        return normalizeRepositoryRows(local);
    }
    return [];
}

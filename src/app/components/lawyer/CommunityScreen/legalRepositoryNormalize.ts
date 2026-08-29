import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { listRepositoryDocumentsSync } from '@/app/services/lawyer-cloud';
import { peekRepositoryDocsCache } from '@/app/services/forum/repositoryDocsWarmCache';
import { resolveRepositoryDocTags } from './repositoryTagUtils';

export function normalizeRepositoryRows(docs: RepositoryDocument[]): RepositoryDocument[] {
    return docs.map((doc) => ({
        ...doc,
        tags: resolveRepositoryDocTags(doc.title, doc.description, doc.tags),
    }));
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

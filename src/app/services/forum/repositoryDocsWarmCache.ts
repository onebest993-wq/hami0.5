import {
    listRepositoryDocumentsSync,
    RepositoryDB,
} from '@/app/services/lawyer-cloud';
import type { RepositoryDocument } from '@/app/services/vault/vaultTypes';
import { withForumAsyncTimeout } from '@/app/components/lawyer/CommunityScreen/forumAsync';
import { warmRepositoryThumbnailUrls } from '@/app/services/forum/repositoryThumbUrlCache';

let warmedDocs: RepositoryDocument[] | null = null;
let warmPromise: Promise<RepositoryDocument[]> | null = null;

/** تجهيز كاش محلي لمستندات المستودع — عند فتح تبويب المستودع */
export function warmRepositoryDocsCache(): void {
    if (warmPromise) return;
    const syncRows = listRepositoryDocumentsSync();
    if (syncRows.length > 0) {
        warmedDocs = syncRows;
    }
    warmPromise = withForumAsyncTimeout(
        RepositoryDB.listDocuments().then((rows) => {
            warmedDocs = rows;
            return rows;
        }),
        4_000,
        syncRows,
    ).catch(() => {
        warmedDocs = warmedDocs ?? syncRows;
        return warmedDocs ?? syncRows;
    });
}

export function peekRepositoryDocsCache(): RepositoryDocument[] | null {
    return warmedDocs;
}

export async function readRepositoryDocsCache(): Promise<RepositoryDocument[]> {
    if (warmedDocs) return warmedDocs;
    warmRepositoryDocsCache();
    return warmPromise ?? Promise.resolve([]);
}

export function setRepositoryDocsCache(docs: RepositoryDocument[]): void {
    warmedDocs = docs;
}

export function resetRepositoryDocsCacheForTests(): void {
    warmedDocs = null;
    warmPromise = null;
}

export { warmRepositoryThumbnailUrls };

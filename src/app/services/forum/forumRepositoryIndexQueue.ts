import { RepositoryDB, type RepositoryDocument } from '@/app/services/cloud/lawyerRepositoryCloud';
import {
    createForumRepositoryDocument,
    updateForumRepositoryDocument,
} from '@/app/services/forum/forumApi/forumApiRepository';
import { isCloudForumStoragePath } from '@/app/services/forum/forumPostCreateGuard';

export async function flushForumRepositoryIndexQueue(): Promise<RepositoryDocument[]> {
    const docs = await RepositoryDB.listDocuments();
    const pending = docs.filter((doc) => doc.indexSync && isCloudForumStoragePath(doc.storagePath));
    const done: RepositoryDocument[] = [];
    for (const doc of pending) {
        try {
            const saved =
                doc.indexSync === 'update'
                    ? await updateForumRepositoryDocument(doc.id, doc)
                    : await createForumRepositoryDocument(doc);
            const cleared: RepositoryDocument = { ...saved, indexSync: undefined };
            await RepositoryDB.saveDocument(cleared);
            done.push(cleared);
        } catch {
            /* يبقى indexSync — العامل يعيد المحاولة طالما المنتدى مفتوحاً */
        }
    }
    return done;
}

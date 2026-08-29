import {
    RepositoryDB,
    LawyerStorage,
    type RepositoryDocument,
} from '@/app/services/lawyer-cloud';
import { isLawyerWorkCloudLive } from '@/app/services/settings/lawyerWorkCloudGate';
import { inferRepositoryMimeType } from './components/repositoryMedia';
import { withForumAsyncTimeout } from './forumAsync';
import { releaseRepositoryBlobUrl } from './repositoryStorageService';

type SyncRepositoryDocumentToCloudParams = {
    savedDoc: RepositoryDocument;
    file: File;
    ownerId: string;
    isStillPresent: (id: string) => boolean;
    applyCloudDoc: (cloudDoc: RepositoryDocument) => void;
};

/** رفع سحابي بعد الحفظ المحلي — لا يعيد مستنداً حُذف أثناء الرفع */
export async function syncRepositoryDocumentToCloud({
    savedDoc,
    file,
    ownerId,
    isStillPresent,
    applyCloudDoc,
}: SyncRepositoryDocumentToCloudParams): Promise<void> {
    if (!isLawyerWorkCloudLive()) return;
    const localPath = savedDoc.storagePath;
    try {
        if (!isStillPresent(savedDoc.id)) return;
        const uploadResult = await LawyerStorage.uploadSmartFile(ownerId, file, 'repository');
        if (!uploadResult?.path) return;
        if (!isStillPresent(savedDoc.id)) return;
        const signedUrl = await withForumAsyncTimeout(
            LawyerStorage.getSignedUrl(uploadResult.path),
            6_000,
            null,
        );
        if (!signedUrl) return;
        if (!isStillPresent(savedDoc.id)) return;
        const cloudDoc: RepositoryDocument = {
            ...savedDoc,
            storagePath: uploadResult.path,
            fileName: file.name,
            mimeType: inferRepositoryMimeType(file),
            fileSize: file.size,
        };
        if (!isStillPresent(savedDoc.id)) return;
        await RepositoryDB.saveDocument(cloudDoc);
        if (!isStillPresent(savedDoc.id)) {
            await RepositoryDB.deleteDocument(savedDoc.id).catch(() => undefined);
            return;
        }
        applyCloudDoc(cloudDoc);
        if (localPath?.startsWith('idb:forum:')) {
            releaseRepositoryBlobUrl(localPath);
        }
    } catch {
        /* النسخة المحلية تبقى متاحة */
    }
}

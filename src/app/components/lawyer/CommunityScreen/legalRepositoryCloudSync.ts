import type { RepositoryDocument } from '@/app/services/lawyer-cloud';
import { LawyerStorage } from '@/app/services/storage/lawyerStorageRuntime';
import { inferRepositoryMimeType } from './components/repositoryMedia';
import { withForumAsyncTimeout } from './forumAsync';
import { purgeRepositoryLocalFile } from './repositoryStorageService';

type PersistRepositoryDocumentToCloudParams = {
    savedDoc: RepositoryDocument;
    file: File;
    ownerId: string;
    isStillPresent: (id: string) => boolean;
    applyCloudDoc: (cloudDoc: RepositoryDocument) => void;
};

/** رفع سحابي إلزامي للنشر في المستودع — لا يعتمد على مزامنة عمل المحامي. */
export async function syncRepositoryDocumentToCloud({
    savedDoc,
    file,
    ownerId,
    isStillPresent,
    applyCloudDoc,
}: PersistRepositoryDocumentToCloudParams): Promise<RepositoryDocument> {
    const localPath = savedDoc.storagePath;
    if (!isStillPresent(savedDoc.id)) {
        throw new Error('cloud-aborted');
    }
    const uploadResult = await LawyerStorage.uploadSmartFile(ownerId, file, 'repository');
    if (!uploadResult?.path) {
        throw new Error('cloud-failed');
    }
    if (!isStillPresent(savedDoc.id)) {
        throw new Error('cloud-aborted');
    }
    const signedUrl = await withForumAsyncTimeout(
        LawyerStorage.getSignedUrl(uploadResult.path),
        6_000,
        null,
    );
    if (!signedUrl) {
        throw new Error('cloud-failed');
    }
    if (!isStillPresent(savedDoc.id)) {
        throw new Error('cloud-aborted');
    }
    const cloudDoc: RepositoryDocument = {
        ...savedDoc,
        storagePath: uploadResult.path,
        fileName: file.name,
        mimeType: inferRepositoryMimeType(file),
        fileSize: file.size,
    };
    applyCloudDoc(cloudDoc);
    if (localPath?.startsWith('idb:forum:')) {
        purgeRepositoryLocalFile(localPath);
    }
    return cloudDoc;
}

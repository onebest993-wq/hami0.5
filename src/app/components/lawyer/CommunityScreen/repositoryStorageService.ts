import {
    buildForumIdbPath,
    getForumBlobObjectUrl,
    parseForumIdbPath,
    putForumBlob,
} from '@/app/services/forumBlobStore';
import { LawyerStorage } from '@/app/services/lawyer-cloud';
import { inferRepositoryMimeType } from './components/repositoryMedia';

function createCacheKey(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** حفظ محلي عند فشل رفع Supabase */
export async function cacheRepositoryFileLocally(file: File): Promise<{
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
}> {
    const cacheKey = createCacheKey();
    const mimeType = inferRepositoryMimeType(file);
    await putForumBlob(cacheKey, file, mimeType);
    return {
        storagePath: buildForumIdbPath(cacheKey),
        fileName: file.name,
        mimeType,
        fileSize: file.size,
    };
}

export async function resolveRepositoryStorageUrl(storagePath: string | undefined | null): Promise<string | null> {
    if (!storagePath?.trim()) return null;
    const idbKey = parseForumIdbPath(storagePath);
    if (idbKey && !idbKey.startsWith('inline:')) {
        const fromIdb = await getForumBlobObjectUrl(idbKey);
        if (fromIdb) return fromIdb;
    }
    if (!storagePath.startsWith('idb:forum:')) {
        return LawyerStorage.getSignedUrl(storagePath);
    }
    return null;
}

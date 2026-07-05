import {
    buildForumIdbPath,
    getForumBlobObjectUrl,
    parseForumIdbPath,
    putForumBlob,
} from '@/app/services/forumBlobStore';
import { LawyerStorage } from '@/app/services/lawyer-cloud';
import { inferRepositoryMimeType } from './components/repositoryMedia';
import { withForumAsyncTimeout } from './forumAsync';
import {
    peekRepositoryBlobUrl,
    registerRepositoryBlobUrl,
    releaseRepositoryBlobUrl,
} from './repositoryBlobRegistry';

const IDB_RESOLVE_ATTEMPTS = 8;
const IDB_RESOLVE_DELAY_MS = 60;
const SIGNED_URL_TIMEOUT_MS = 6_000;
const DOWNLOAD_FETCH_TIMEOUT_MS = 20_000;

function createCacheKey(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export type ReservedRepositoryFile = {
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    persist: () => Promise<void>;
};

/** يحجز مساراً محلياً فوراً ويكتب الملف في الخلفية */
export function reserveRepositoryFileLocally(file: File): ReservedRepositoryFile {
    const cacheKey = createCacheKey();
    const mimeType = inferRepositoryMimeType(file);
    const storagePath = buildForumIdbPath(cacheKey);
    registerRepositoryBlobUrl(storagePath, file);
    return {
        storagePath,
        fileName: file.name,
        mimeType,
        fileSize: file.size,
        persist: () => putForumBlob(cacheKey, file, mimeType),
    };
}

/** حفظ محلي عند فشل رفع Supabase */
export async function cacheRepositoryFileLocally(file: File): Promise<{
    storagePath: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
}> {
    const reserved = reserveRepositoryFileLocally(file);
    await reserved.persist();
    return {
        storagePath: reserved.storagePath,
        fileName: reserved.fileName,
        mimeType: reserved.mimeType,
        fileSize: reserved.fileSize,
    };
}

export async function resolveRepositoryStorageUrl(storagePath: string | undefined | null): Promise<string | null> {
    if (!storagePath?.trim()) return null;

    const fromMemory = peekRepositoryBlobUrl(storagePath);
    if (fromMemory) return fromMemory;

    const idbKey = parseForumIdbPath(storagePath);
    if (idbKey && !idbKey.startsWith('inline:')) {
        for (let attempt = 0; attempt < IDB_RESOLVE_ATTEMPTS; attempt++) {
            const fromIdb = await getForumBlobObjectUrl(idbKey);
            if (fromIdb) return fromIdb;
            if (attempt < IDB_RESOLVE_ATTEMPTS - 1) {
                await new Promise((resolve) => {
                    setTimeout(resolve, IDB_RESOLVE_DELAY_MS * (attempt + 1));
                });
            }
        }
    }

    if (!storagePath.startsWith('idb:forum:')) {
        return withForumAsyncTimeout(
            LawyerStorage.getSignedUrl(storagePath),
            SIGNED_URL_TIMEOUT_MS,
            null,
        );
    }
    return null;
}

export { releaseRepositoryBlobUrl };

/** تنزيل ملف المستودع — يدعم blob محلي وروابط موقّعة */
export async function downloadRepositoryFile(url: string, fileName: string): Promise<void> {
    const safeName = fileName.trim() || 'document';
    if (url.startsWith('blob:')) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = safeName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        return;
    }

    const response = await withForumAsyncTimeout(fetch(url), DOWNLOAD_FETCH_TIMEOUT_MS, null);
    if (!response?.ok) {
        throw new Error('download-failed');
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    try {
        const anchor = document.createElement('a');
        anchor.href = blobUrl;
        anchor.download = safeName;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    } finally {
        URL.revokeObjectURL(blobUrl);
    }
}

import type { CommunityAttachment } from '@/app/services/lawyer-cloud';
import { LawyerStorage } from '@/app/services/storage/lawyerStorageRuntime';
import {
    FORUM_IDB_PREFIX,
    buildForumIdbPath,
    getForumBlob,
    getForumBlobObjectUrl,
    parseForumIdbPath,
    putForumBlob,
} from '@/app/services/forumBlobStore';

const IDB_PERSIST_TIMEOUT_MS = 4_000;
const BLOCKED_URL_SCHEMES = /^(javascript|data:text\/html|vbscript):/i;

function createCacheKey(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function isCloudStoragePath(path: string | undefined | null): boolean {
    const trimmed = path?.trim() ?? '';
    return Boolean(trimmed && !trimmed.startsWith(FORUM_IDB_PREFIX));
}

function isEphemeralIdbKey(idbKey: string | null): boolean {
    if (!idbKey) return true;
    return idbKey.startsWith('pending:') || idbKey.startsWith('blob:');
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('forum-attachment-timeout')), ms);
            }),
        ]);
    } catch {
        return fallback;
    }
}

async function blobUrlToFile(
    url: string,
    fileName: string,
    mimeType?: string,
): Promise<File | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], fileName, {
            type: mimeType || blob.type || 'application/octet-stream',
        });
    } catch {
        return null;
    }
}

export async function readCommunityAttachmentFile(attachment: CommunityAttachment): Promise<File | null> {
    const fileName = attachment.name?.trim() || 'forum-attachment';
    const fallbackMime =
        attachment.type === 'image'
            ? 'image/jpeg'
            : attachment.type === 'audio'
              ? 'audio/webm'
              : 'application/octet-stream';
    const mimeType = attachment.mimeType || fallbackMime;

    const idbKey = parseForumIdbPath(attachment.storagePath);
    if (!idbKey || isEphemeralIdbKey(idbKey)) {
        if (attachment.url?.startsWith('blob:')) {
            const fromBlob = await blobUrlToFile(attachment.url, fileName, mimeType);
            if (fromBlob) return fromBlob;
        }
        if (attachment.url?.startsWith('data:')) {
            const fromData = await blobUrlToFile(attachment.url, fileName, mimeType);
            if (fromData) return fromData;
        }
    }

    if (idbKey && !isEphemeralIdbKey(idbKey)) {
        const fromIdb = await getForumBlob(idbKey);
        if (fromIdb) {
            return new File([fromIdb.blob], fileName, {
                type: attachment.mimeType || fromIdb.mimeType || mimeType,
            });
        }
    }

    if (attachment.url?.startsWith('blob:')) {
        return blobUrlToFile(attachment.url, fileName, mimeType);
    }

    if (attachment.url?.startsWith('data:')) {
        return blobUrlToFile(attachment.url, fileName, mimeType);
    }

    const storagePath = attachment.storagePath?.trim();
    if (isCloudStoragePath(storagePath)) {
        const signed = await LawyerStorage.getSignedUrl(storagePath!);
        if (signed) {
            return blobUrlToFile(signed, fileName, mimeType);
        }
    }

    const rawUrl = attachment.url?.trim();
    if (rawUrl && !rawUrl.startsWith('blob:') && !BLOCKED_URL_SCHEMES.test(rawUrl)) {
        return blobUrlToFile(rawUrl, fileName, mimeType);
    }

    return null;
}

/** معاينة فورية — لا تنتظر IDB أو FileReader */
export function createInstantForumAttachmentPreview(file: File): {
    url: string;
    storagePath: string;
} {
    return {
        url: URL.createObjectURL(file),
        storagePath: buildForumIdbPath(`pending:${createCacheKey()}`),
    };
}

/** يخزّن المرفق في IDB خلفياً — لا يُستخدم لمسار المعاينة الفورية */
export async function persistForumAttachmentFile(file: File): Promise<string> {
    const cacheKey = createCacheKey();
    try {
        await withTimeout(
            putForumBlob(cacheKey, file, file.type || 'application/octet-stream'),
            IDB_PERSIST_TIMEOUT_MS,
            undefined,
        );
        return buildForumIdbPath(cacheKey);
    } catch {
        throw new Error('forum-attachment-idb-failed');
    }
}

/** يجهّز المرفق للنشر: IDB ثم سحابة — يجب await قبل createPost */
export async function prepareForumAttachmentForPublish(
    attachment: CommunityAttachment,
    userId: string,
    sourceFile?: File | null,
): Promise<CommunityAttachment> {
    let working = { ...attachment };

    if (sourceFile) {
        const storagePath = await persistForumAttachmentFile(sourceFile);
        working = {
            ...working,
            storagePath,
            mimeType: sourceFile.type || working.mimeType,
        };
    } else if (!isCloudStoragePath(working.storagePath)) {
        const idbKey = parseForumIdbPath(working.storagePath);
        if (!idbKey || isEphemeralIdbKey(idbKey)) {
            const file = await readCommunityAttachmentFile(working);
            if (file) {
                const storagePath = await persistForumAttachmentFile(file);
                working = { ...working, storagePath };
            }
        }
    }

    try {
        return await finalizeForumAttachmentForPersist(working, userId);
    } catch (error) {
        const idbKey = parseForumIdbPath(working.storagePath);
        if (idbKey && !isEphemeralIdbKey(idbKey)) {
            return {
                ...working,
                ...(working.url?.trim() ? { url: working.url.trim() } : {}),
            };
        }
        throw error;
    }
}

/** يرفع المرفق للسحابة قبل حفظ المنشور — يمنع اختفاء الصور بعد إعادة التحميل */
export async function finalizeForumAttachmentForPersist(
    attachment: CommunityAttachment,
    userId: string,
): Promise<CommunityAttachment> {
    const storagePath = attachment.storagePath?.trim() ?? '';

    if (isCloudStoragePath(storagePath)) {
        const signed =
            (await LawyerStorage.getSignedUrl(storagePath)) ||
            (attachment.url?.startsWith('blob:') ? null : attachment.url?.trim()) ||
            '';
        return {
            ...attachment,
            url: signed || attachment.url,
            storagePath,
        };
    }

    const file = await readCommunityAttachmentFile(attachment);
    if (!file) {
        throw new Error('forum-attachment-missing-bytes');
    }

    const category =
        attachment.type === 'audio' ? 'audio' : attachment.type === 'document' ? 'drafts' : 'drafts';
    const uploaded = await LawyerStorage.uploadSmartFile(userId, file, category);
    const cloudPath = uploaded.path || uploaded.fullPath;
    if (!cloudPath) {
        throw new Error('forum-attachment-upload-missing-path');
    }

    const url =
        uploaded.downloadUrl ||
        (await LawyerStorage.getSignedUrl(cloudPath)) ||
        attachment.url;

    return {
        ...attachment,
        url,
        storagePath: cloudPath,
        mimeType: file.type || attachment.mimeType,
    };
}

/** @deprecated استخدم createInstantForumAttachmentPreview + persistForumAttachmentFile */
export async function cacheForumAttachmentFile(file: File): Promise<{
    url: string;
    storagePath: string;
}> {
    const instant = createInstantForumAttachmentPreview(file);
    const storagePath = await persistForumAttachmentFile(file);
    return { url: instant.url, storagePath };
}

/** يُجدّد رابط المرفق (signed URL منتهٍ، blob ميت، أو idb) */
export async function resolveCommunityAttachmentUrl(
    attachment: CommunityAttachment | null | undefined,
): Promise<string | null> {
    if (!attachment) return null;

    const storagePath = attachment.storagePath?.trim() ?? '';
    if (isCloudStoragePath(storagePath)) {
        const fresh = await LawyerStorage.getSignedUrl(storagePath);
        if (fresh) {
            return fresh;
        }
    }

    const idbKey = parseForumIdbPath(storagePath);
    if (idbKey && !isEphemeralIdbKey(idbKey)) {
        const fromIdb = await getForumBlobObjectUrl(idbKey);
        if (fromIdb) {
            return fromIdb;
        }
    }

    if (attachment.url?.startsWith('data:')) {
        return attachment.url;
    }

    const rawUrl = attachment.url?.trim();
    if (rawUrl && !rawUrl.startsWith('blob:') && !BLOCKED_URL_SCHEMES.test(rawUrl)) {
        return rawUrl;
    }
    if (rawUrl?.startsWith('blob:')) {
        const file = await blobUrlToFile(rawUrl, attachment.name || 'attachment', attachment.mimeType);
        if (file) {
            return URL.createObjectURL(file);
        }
    }

    return null;
}

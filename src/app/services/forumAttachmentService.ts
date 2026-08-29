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
import { isSafeForumAttachmentUrl } from '@/app/services/forum/forumUrlSafety';

export { isSafeForumAttachmentUrl } from '@/app/services/forum/forumUrlSafety';

const IDB_PERSIST_TIMEOUT_MS = 4_000;

void 0; // placeholder to keep line - will remove withTimeout instead

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

function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error ?? new Error('forum-attachment-data-url-failed'));
        reader.readAsDataURL(file);
    });
}

function isEncryptedForumAttachment(
    attachment: CommunityAttachment,
    storagePath: string,
): boolean {
    if (attachment.encrypted === true) return true;
    return /\.enc$/i.test(storagePath);
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
    if (rawUrl && !rawUrl.startsWith('blob:') && isSafeForumAttachmentUrl(rawUrl)) {
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
        await Promise.race([
            putForumBlob(cacheKey, file, file.type || 'application/octet-stream'),
            new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('forum-attachment-timeout')), IDB_PERSIST_TIMEOUT_MS);
            }),
        ]);
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
    } catch {
        return persistLocalForumAttachment(working, sourceFile ?? null);
    }
}

async function persistLocalForumAttachment(
    attachment: CommunityAttachment,
    sourceFile: File | null,
): Promise<CommunityAttachment> {
    const file = sourceFile ?? (await readCommunityAttachmentFile(attachment));
    let url = attachment.url?.trim() ?? '';
    if (attachment.type === 'image' && (!url || url.startsWith('blob:')) && file) {
        try {
            const dataUrl = await fileToDataUrl(file);
            if (dataUrl.startsWith('data:image/') && isSafeForumAttachmentUrl(dataUrl)) {
                url = dataUrl;
            }
        } catch {
            /* keep existing url */
        }
    }
    return {
        ...attachment,
        url: url || attachment.url,
        mimeType: file?.type || attachment.mimeType,
        bucket: undefined,
        encrypted: undefined,
    };
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
            (attachment.url && !attachment.url.startsWith('blob:') ? attachment.url.trim() : '') ||
            '';
        if (signed && isSafeForumAttachmentUrl(signed) && !signed.startsWith('blob:')) {
            return {
                ...attachment,
                url: signed,
                storagePath,
            };
        }
    }

    const file = await readCommunityAttachmentFile(attachment);
    if (!file) {
        throw new Error('forum-attachment-missing-bytes');
    }

    const category =
        attachment.type === 'image' ? 'forum-media' : attachment.type === 'audio' ? 'audio' : 'drafts';
    try {
        const uploaded = await LawyerStorage.uploadSmartFile(userId, file, category);
        const cloudPath = uploaded.path || uploaded.fullPath;
        const url =
            uploaded.downloadUrl ||
            (cloudPath ? await LawyerStorage.getSignedUrl(cloudPath) : '') ||
            '';
        if (cloudPath && url && isSafeForumAttachmentUrl(url)) {
            return {
                ...attachment,
                url,
                storagePath: cloudPath,
                bucket: uploaded.bucket || (category === 'forum-media' ? 'forum-media' : attachment.bucket),
                mimeType: file.type || attachment.mimeType,
            };
        }
    } catch {
        /* يبقى المسار المحلي */
    }

    return persistLocalForumAttachment(attachment, file);
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
    if (isEncryptedForumAttachment(attachment, storagePath)) {
        try {
            const { resolveEncryptedForumImageUrl } = await import('@/lib/forumService.js');
            const decrypted = await resolveEncryptedForumImageUrl(attachment);
            if (decrypted) return decrypted;
        } catch {
            /* نكمل المسارات غير المشفّرة */
        }
    }

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
        return isSafeForumAttachmentUrl(attachment.url) ? attachment.url : null;
    }

    const rawUrl = attachment.url?.trim();
    if (rawUrl && !rawUrl.startsWith('blob:') && isSafeForumAttachmentUrl(rawUrl)) {
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

import type { CommunityAttachment } from '@/app/services/cloud/lawyerCommunityTypes';
import { isSafeForumAttachmentUrl } from '@/app/services/forum/forumUrlSafety';
import { FORUM_IDB_PREFIX, parseForumIdbPath } from '@/app/services/forumBlobPath';

function isCloudStoragePath(path: string | undefined | null): boolean {
    const trimmed = path?.trim() ?? '';
    return Boolean(trimmed && !trimmed.startsWith(FORUM_IDB_PREFIX));
}

function isEphemeralIdbKey(idbKey: string | null): boolean {
    if (!idbKey) return true;
    return idbKey.startsWith('pending:') || idbKey.startsWith('blob:');
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

/** يُجدّد رابط المرفق (signed URL منتهٍ، blob ميت، أو idb) — بلا LawyerStorage على التقييم */
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
        const { LawyerStorage } = await import('@/app/services/storage/lawyerStorageRuntime');
        const fresh = await LawyerStorage.getSignedUrl(storagePath);
        if (fresh) {
            return fresh;
        }
    }

    const idbKey = parseForumIdbPath(storagePath);
    if (idbKey && !isEphemeralIdbKey(idbKey)) {
        const { getForumBlobObjectUrl } = await import('@/app/services/forumBlobStore');
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

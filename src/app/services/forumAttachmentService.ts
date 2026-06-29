import type { CommunityAttachment } from '@/app/services/lawyer-cloud';
import { LawyerStorage } from '@/app/services/lawyer-cloud';
import {
    buildForumIdbPath,
    getForumBlobObjectUrl,
    parseForumIdbPath,
    putForumBlob,
} from '@/app/services/forumBlobStore';

const INLINE_DATA_URL_MAX = 512 * 1024;

function createCacheKey(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') resolve(reader.result);
            else reject(new Error('read failed'));
        };
        reader.onerror = () => reject(reader.error ?? new Error('read failed'));
        reader.readAsDataURL(file);
    });
}

/** يخزّن المرفق محلياً (IndexedDB أو data URL للملفات الصغيرة) */
export async function cacheForumAttachmentFile(file: File): Promise<{
    url: string;
    storagePath: string;
}> {
    if (file.size <= INLINE_DATA_URL_MAX && file.type.startsWith('image/')) {
        const dataUrl = await readFileAsDataUrl(file);
        return {
            url: dataUrl,
            storagePath: buildForumIdbPath(`inline:${createCacheKey()}`),
        };
    }

    const cacheKey = createCacheKey();
    await putForumBlob(cacheKey, file, file.type || 'application/octet-stream');
    const objectUrl = await getForumBlobObjectUrl(cacheKey);
    return {
        url: objectUrl ?? URL.createObjectURL(file),
        storagePath: buildForumIdbPath(cacheKey),
    };
}

/** يُجدّد رابط المرفق (signed URL منتهٍ، blob ميت، أو idb) */
export async function resolveCommunityAttachmentUrl(
    attachment: CommunityAttachment | null | undefined,
): Promise<string | null> {
    if (!attachment) return null;

    const idbKey = parseForumIdbPath(attachment.storagePath);
    if (idbKey) {
        if (idbKey.startsWith('inline:')) {
            if (attachment.url?.startsWith('data:')) return attachment.url;
            return null;
        }
        const fromIdb = await getForumBlobObjectUrl(idbKey);
        if (fromIdb) return fromIdb;
    }

    const storagePath = attachment.storagePath?.trim();
    if (storagePath && !storagePath.startsWith('idb:forum:')) {
        const fresh = await LawyerStorage.getSignedUrl(storagePath);
        if (fresh) return fresh;
    }

    if (attachment.url?.startsWith('data:') || attachment.url?.startsWith('blob:')) {
        return attachment.url;
    }

    const rawUrl = attachment.url?.trim();
    if (rawUrl && !/^(javascript|data:text\/html|vbscript):/i.test(rawUrl)) {
        return rawUrl;
    }
    return null;
}

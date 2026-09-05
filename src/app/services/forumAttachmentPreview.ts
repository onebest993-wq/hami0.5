import { buildForumIdbPath } from '@/app/services/forumBlobPath';

function createCacheKey(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

/** معاينة فورية — لا تنتظر IDB أو FileReader ولا تسحب LawyerStorage */
export function createInstantForumAttachmentPreview(file: File): {
    url: string;
    storagePath: string;
} {
    return {
        url: URL.createObjectURL(file),
        storagePath: buildForumIdbPath(`pending:${createCacheKey()}`),
    };
}

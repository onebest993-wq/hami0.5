import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { readCommunityAttachmentFile, resolveCommunityAttachmentUrl } from '@/app/services/forumAttachmentService';
import { saveFileToVault } from '@/app/services/vaultUploadService';

let forumPostPersistAbort: AbortController | undefined;

export function abortForumPostPersistActions(): void {
    if (forumPostPersistAbort) {
        forumPostPersistAbort.abort();
        forumPostPersistAbort = undefined;
    }
}

async function urlToFile(url: string, fileName: string, mimeType: string): Promise<File | null> {
    try {
        forumPostPersistAbort = new AbortController();
        const res = await fetch(url, { signal: forumPostPersistAbort.signal });
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], fileName, { type: mimeType || blob.type || 'application/octet-stream' });
    } catch {
        return null;
    }
}

/** حفظ مرفق المنشور (صورة/ملف) في مخزن المستخدم */
export async function saveForumAttachmentToVault(
    post: CommunityPost,
    userId: string,
    authorName: string,
): Promise<SmartVaultDoc> {
    if (!post.attachment) {
        throw new Error('[services_forum:noattachment] no-attachment');
    }

    const fileName = post.attachment.name?.trim() || `forum-${post.id}`;
    const mimeType =
        post.attachment.mimeType?.trim() ||
        (post.attachment.type === 'image'
            ? 'image/jpeg'
            : post.attachment.type === 'audio'
              ? 'audio/mpeg'
              : 'application/pdf');

    const resolvedUrl = await resolveCommunityAttachmentUrl(post.attachment);
    const file =
        (await readCommunityAttachmentFile(post.attachment)) ??
        (resolvedUrl ? await urlToFile(resolvedUrl, fileName, mimeType) : null);
    if (!file) {
        throw new Error('[services_forum:fetchfailed] fetch-failed');
    }

    const titleBase = post.content.trim().slice(0, 60) || fileName;
    const saved = await saveFileToVault(userId, file, {
        title: `من المنتدى — ${titleBase}`,
        tags: ['منتدى', ...post.tags.map((t) => t.replace(/^#/, ''))].slice(0, 8),
        customCategory: 'المنتدى',
        lawyerNote: `محفوظ من منشور المنتدى بواسطة ${authorName}\n\n${post.content.trim().slice(0, 400)}`,
        fileName,
    });
    return saved.doc;
}

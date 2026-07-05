import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { readCommunityAttachmentFile, resolveCommunityAttachmentUrl } from '@/app/services/forumAttachmentService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { STORAGE_KEYS } from '@/app/utils/constants';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { saveFileToVault } from '@/app/services/vaultUploadService';

export const LAWYER_NOTES_EXTERNAL_UPDATE = 'hami:lawyer-notes-external-update';

function dispatchNotesUpdated(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(LAWYER_NOTES_EXTERNAL_UPDATE));
}

async function urlToFile(url: string, fileName: string, mimeType: string): Promise<File | null> {
    try {
        //#region debug-point save-to-vault-url-to-file-start
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'save-to-vault',
                runId: 'post-fix',
                hypothesisId: 'B',
                location: 'forumPostPersistActions.ts:urlToFile:start',
                msg: '[DEBUG] urlToFile starting fetch',
                data: {
                    fileName,
                    mimeType,
                    urlScheme: typeof url === 'string' ? (url.split(':', 1)[0] ?? null) : null,
                },
                ts: Date.now(),
            }),
        }).catch(() => undefined);
        //#endregion debug-point save-to-vault-url-to-file-start
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        //#region debug-point save-to-vault-url-to-file-done
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'save-to-vault',
                runId: 'post-fix',
                hypothesisId: 'B',
                location: 'forumPostPersistActions.ts:urlToFile:done',
                msg: '[DEBUG] urlToFile created file from blob',
                data: {
                    fileName,
                    blobType: blob.type || null,
                    blobSize: blob.size,
                },
                ts: Date.now(),
            }),
        }).catch(() => undefined);
        //#endregion debug-point save-to-vault-url-to-file-done
        return new File([blob], fileName, { type: mimeType || blob.type || 'application/octet-stream' });
    } catch {
        //#region debug-point save-to-vault-url-to-file-failed
        fetch('http://127.0.0.1:7777/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'save-to-vault',
                runId: 'post-fix',
                hypothesisId: 'B',
                location: 'forumPostPersistActions.ts:urlToFile:failed',
                msg: '[DEBUG] urlToFile failed',
                data: { fileName },
                ts: Date.now(),
            }),
        }).catch(() => undefined);
        //#endregion debug-point save-to-vault-url-to-file-failed
        return null;
    }
}

/** حفظ نص المنشور في المفكرة المحلية */
export async function saveForumPostToNotepad(post: CommunityPost): Promise<void> {
    const notes = persistenceRepository.load<GlobalNote[]>(STORAGE_KEYS.LAWYER_NOTES) || [];
    const stamp = new Date(post.createdAt).toLocaleDateString('ar-IQ', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    const author = post.isAnonymous ? 'زميل مجهول' : post.authorName;
    const tagLine = post.tags.length > 0 ? `\n\n#${post.tags.join(' #')}` : '';
    const note: GlobalNote = {
        id: Date.now(),
        title: `من المنتدى — ${author}`.slice(0, 80),
        body: `[${stamp} · ${author}]\n\n${post.content.trim()}${tagLine}`,
        isPinned: false,
        date: new Date().toISOString(),
        type: 'text',
    };
    persistenceRepository.save(STORAGE_KEYS.LAWYER_NOTES, [note, ...notes]);
    dispatchNotesUpdated();
}

/** حفظ مرفق المنشور (صورة/ملف) في مخزن المستخدم */
export async function saveForumAttachmentToVault(
    post: CommunityPost,
    userId: string,
    authorName: string,
): Promise<SmartVaultDoc> {
    if (!post.attachment) {
        throw new Error('no-attachment');
    }
    //#region debug-point save-to-vault-post-start
    fetch('http://127.0.0.1:7777/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: 'save-to-vault',
            runId: 'post-fix',
            hypothesisId: 'A',
            location: 'forumPostPersistActions.ts:saveForumAttachmentToVault:start',
            msg: '[DEBUG] saveForumAttachmentToVault started',
            data: {
                postId: post.id,
                userId,
                attachmentType: post.attachment.type,
                attachmentName: post.attachment.name ?? null,
                storagePath: post.attachment.storagePath ?? null,
                attachmentUrl: post.attachment.url ?? null,
            },
            ts: Date.now(),
        }),
    }).catch(() => undefined);
    //#endregion debug-point save-to-vault-post-start

    const fileName = post.attachment.name?.trim() || `forum-${post.id}`;
    const mimeType =
        post.attachment.mimeType?.trim() ||
        (post.attachment.type === 'image'
            ? 'image/jpeg'
            : post.attachment.type === 'audio'
              ? 'audio/mpeg'
              : 'application/pdf');

    const resolvedUrl = await resolveCommunityAttachmentUrl(post.attachment);
    //#region debug-point save-to-vault-resolved-url
    fetch('http://127.0.0.1:7777/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: 'save-to-vault',
            runId: 'post-fix',
            hypothesisId: 'A',
            location: 'forumPostPersistActions.ts:saveForumAttachmentToVault:resolvedUrl',
            msg: '[DEBUG] saveForumAttachmentToVault resolved attachment url',
            data: {
                postId: post.id,
                hasResolvedUrl: Boolean(resolvedUrl),
                urlScheme: resolvedUrl ? (resolvedUrl.split(':', 1)[0] ?? null) : null,
                storagePath: post.attachment.storagePath ?? null,
            },
            ts: Date.now(),
        }),
    }).catch(() => undefined);
    //#endregion debug-point save-to-vault-resolved-url
    const file =
        (await readCommunityAttachmentFile(post.attachment)) ??
        (resolvedUrl ? await urlToFile(resolvedUrl, fileName, mimeType) : null);
    if (!file) {
        throw new Error('fetch-failed');
    }

    const titleBase = post.content.trim().slice(0, 60) || fileName;
    const saved = await saveFileToVault(userId, file, {
        title: `من المنتدى — ${titleBase}`,
        tags: ['منتدى', ...post.tags.map((t) => t.replace(/^#/, ''))].slice(0, 8),
        customCategory: 'المنتدى',
        lawyerNote: `محفوظ من منشور المنتدى بواسطة ${authorName}\n\n${post.content.trim().slice(0, 400)}`,
        fileName,
    });
    //#region debug-point save-to-vault-post-done
    fetch('http://127.0.0.1:7777/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: 'save-to-vault',
            runId: 'post-fix',
            hypothesisId: 'C',
            location: 'forumPostPersistActions.ts:saveForumAttachmentToVault:done',
            msg: '[DEBUG] saveForumAttachmentToVault saved into vault',
            data: {
                postId: post.id,
                docId: saved.doc.id,
                storagePath: saved.doc.storagePath,
                localOnly: saved.localOnly,
            },
            ts: Date.now(),
        }),
    }).catch(() => undefined);
    //#endregion debug-point save-to-vault-post-done
    return saved.doc;
}

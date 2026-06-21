import type { CommunityPost } from '@/app/services/lawyer-cloud';
import {
    LawyerStorage,
    RepositoryDB,
    uuidv4,
    type RepositoryDocument,
} from '@/app/services/lawyer-cloud';
import { resolveCommunityAttachmentUrl } from '@/app/services/forumAttachmentService';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { STORAGE_KEYS } from '@/app/utils/constants';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';

export const LAWYER_NOTES_EXTERNAL_UPDATE = 'hami:lawyer-notes-external-update';

function dispatchNotesUpdated(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(LAWYER_NOTES_EXTERNAL_UPDATE));
}

function inferRepositoryType(mimeType: string): RepositoryDocument['type'] {
    if (mimeType.includes('pdf')) return 'قرار حكم';
    if (mimeType.startsWith('image/')) return 'أخرى';
    return 'بحث قانوني';
}

async function urlToFile(url: string, fileName: string, mimeType: string): Promise<File | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new File([blob], fileName, { type: mimeType || blob.type || 'application/octet-stream' });
    } catch {
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

/** حفظ مرفق المنشور (صورة/ملف) في المخزن القانوني */
export async function saveForumAttachmentToVault(
    post: CommunityPost,
    userId: string,
    authorName: string,
): Promise<void> {
    if (!post.attachment) {
        throw new Error('no-attachment');
    }
    const resolvedUrl = await resolveCommunityAttachmentUrl(post.attachment);
    if (!resolvedUrl) {
        throw new Error('resolve-failed');
    }

    const fileName = post.attachment.name?.trim() || `forum-${post.id}`;
    const mimeType = post.attachment.type === 'image'
        ? 'image/jpeg'
        : post.attachment.type === 'audio'
          ? 'audio/mpeg'
          : 'application/pdf';

    const file = await urlToFile(resolvedUrl, fileName, mimeType);
    if (!file) {
        throw new Error('fetch-failed');
    }

    let storagePath = post.attachment.storagePath?.trim() ?? '';
    let fileSize = file.size;

    if (!storagePath || storagePath.startsWith('idb:forum:') || resolvedUrl.startsWith('blob:')) {
        try {
            const uploaded = await LawyerStorage.uploadSmartFile(userId, file, 'repository');
            storagePath = uploaded.path;
        } catch {
            storagePath = post.attachment.storagePath || `local:forum:${post.id}`;
        }
    }

    const titleBase = post.content.trim().slice(0, 60) || fileName;
    const doc: RepositoryDocument = {
        id: uuidv4(),
        title: `من المنتدى — ${titleBase}`,
        description: `محفوظ من منشور المنتدى (${authorName}). ${post.content.trim().slice(0, 200)}`,
        type: inferRepositoryType(mimeType),
        authorId: userId,
        authorName,
        uploadDate: new Date().toISOString().split('T')[0],
        fileName,
        mimeType: file.type || mimeType,
        storagePath,
        fileSize,
        tags: ['#منتدى', ...post.tags.map((t) => (t.startsWith('#') ? t : `#${t}`))].slice(0, 8),
    };

    await RepositoryDB.saveDocument(doc);
}

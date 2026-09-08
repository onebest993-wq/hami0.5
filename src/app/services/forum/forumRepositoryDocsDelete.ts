import { loadForumSupabaseAdmin } from '@/app/services/forum/loadForumSupabaseAdmin';
import { isMissingTableError } from '@/app/services/forum/forumRepositoryDocsMap';
import { removeForumRepositoryStorageOrEnqueue } from '@/app/services/forum/forumRepositoryOrphanSweep';

export async function deleteForumRepositoryDocOnServer(
    docId: string,
    requesterId: string,
    isAdmin: boolean,
): Promise<void> {
    const admin = await loadForumSupabaseAdmin();
    if (!admin) throw new Error('[forumRepo:postgres:opcode] تعذّر حذف المستند من الفهرس');

    const { data: existing, error: fetchError } = await admin
        .from('forum_repository_docs')
        .select('id, author_id, storage_path')
        .eq('id', docId)
        .maybeSingle();
    if (fetchError && !isMissingTableError(fetchError.message)) {
        throw new Error('[forumRepo:postgres:opcode] تعذّر حذف المستند من الفهرس');
    }
    if (!existing) throw new Error('[forumRepo:postgres:opcode] المستند غير موجود أو لا يخصّك');
    const row = existing as { id: string; author_id: string; storage_path: string };
    if (!isAdmin && row.author_id !== requesterId) {
        throw new Error('[forumRepo:postgres:opcode] المستند غير موجود أو لا يخصّك');
    }

    const { error } = await admin.from('forum_repository_docs').delete().eq('id', docId);
    if (error && !isMissingTableError(error.message)) {
        throw new Error('[forumRepo:postgres:opcode] تعذّر حذف المستند من الفهرس');
    }

    const storagePath = row.storage_path?.trim();
    if (!storagePath) return;
    try {
        const { count } = await admin
            .from('forum_repository_docs')
            .select('id', { count: 'exact', head: true })
            .eq('storage_path', storagePath);
        if ((count ?? 0) > 0) return;
    } catch {
        /* إن تعذّر العدّ نحاول الإزالة — المرجع سقط أصلاً */
    }
    await removeForumRepositoryStorageOrEnqueue(admin, row.author_id, storagePath);
}

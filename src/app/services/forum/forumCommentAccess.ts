import { assertForumPostGroupAccess } from '@/app/services/forum/forumGroupMutationGate';

export async function resolveForumCommentPostId(commentId: string): Promise<string | null> {
    const id = commentId.trim();
    if (!id) return null;

    const { loadForumSupabaseAdmin } = await import('./loadForumSupabaseAdmin');
    const admin = await loadForumSupabaseAdmin();
    if (admin) {
        const { data } = await admin.from('forum_comments').select('post_id').eq('id', id).maybeSingle();
        const postId =
            data && typeof (data as { post_id?: unknown }).post_id === 'string'
                ? (data as { post_id: string }).post_id.trim()
                : '';
        return postId || null;
    }

    const { getCommunityPosts } = await import('./forumCommunityRuntime');
    const posts = await getCommunityPosts();
    const hit = posts.find((p) => p.comments.some((c) => c.id === id));
    return hit?.id ?? null;
}

/** عضوية المجموعة قبل التصويت/البلاغ على تعليق — يفشل مغلقاً إن لم يُوجد التعليق */
export async function assertForumCommentGroupAccess(
    commentId: string,
    userId: string,
    isAdmin: boolean,
): Promise<void> {
    const postId = await resolveForumCommentPostId(commentId);
    if (!postId) {
        throw new Error('التعليق غير موجود');
    }
    const { ForumRepository } = await import('./forumRepository');
    const existing = await ForumRepository.getPostById(postId);
    if (!existing) {
        throw new Error('المنشور غير موجود');
    }
    await assertForumPostGroupAccess(existing, userId, isAdmin);
}

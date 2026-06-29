import { UserRole } from '@/app/types/admin-types';
import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';
import { getForumSupabaseAdmin } from './supabaseAdmin';

export type ForumPostReader = {
    getPostById(postId: string): Promise<CommunityPost | null>;
};

export function createForumCommentRepository(posts: ForumPostReader) {
    return {
        async addComment(postId: string, comment: CommunityComment): Promise<CommunityPost> {
            const admin = getForumSupabaseAdmin();
            if (!admin) {
                const { addCommunityComment } = await import('@/app/services/cloud/lawyerCommunityCloud');
                await addCommunityComment(postId, comment);
                const post = await posts.getPostById(postId);
                if (!post) throw new Error('المنشور غير موجود');
                const parentComment = comment.parentId
                    ? post.comments.find((c) => c.id === comment.parentId) ?? null
                    : null;
                const {
                    autoSubscribeCommenterToThread,
                    dispatchCommentNotifications,
                } = await import('./forumNotificationDispatch');
                await autoSubscribeCommenterToThread(comment.authorId, postId);
                await dispatchCommentNotifications({ post, comment, parentComment });
                return post;
            }

            const existingPost = await posts.getPostById(postId);
            if (!existingPost) throw new Error('المنشور غير موجود');
            if (existingPost.isLocked) throw new Error('النقاش على هذا المنشور مقفل');

            const { error } = await admin.from('forum_comments').insert({
                id: comment.id,
                post_id: postId,
                author_id: comment.authorId,
                author_name: comment.authorName,
                content: comment.content,
                parent_id: comment.parentId ?? null,
                created_at: comment.createdAt,
            });
            if (error) throw new Error(error.message);

            const post = await posts.getPostById(postId);
            if (!post) throw new Error('المنشور غير موجود');

            const parentComment = comment.parentId
                ? post.comments.find((c) => c.id === comment.parentId) ?? null
                : null;
            const { dispatchCommentNotifications, autoSubscribeCommenterToThread } = await import(
                './forumNotificationDispatch'
            );
            await autoSubscribeCommenterToThread(comment.authorId, postId);
            await dispatchCommentNotifications({ post, comment, parentComment });

            return post;
        },

        async deleteComment(
            postId: string,
            commentId: string,
            requesterId: string,
            requesterRole?: UserRole,
        ): Promise<CommunityPost> {
            const post = await posts.getPostById(postId);
            if (!post) throw new Error('المنشور غير موجود');
            const comment = post.comments.find((c) => c.id === commentId);
            if (!comment) throw new Error('التعليق غير موجود');
            const isAdmin =
                requesterRole === UserRole.SUPER_ADMIN || requesterRole === UserRole.MODERATOR;
            if (comment.authorId !== requesterId && post.authorId !== requesterId && !isAdmin) {
                throw new Error('ليس لديك صلاحية لحذف هذا التعليق');
            }

            const admin = getForumSupabaseAdmin();
            if (!admin) {
                const { deleteCommunityComment } = await import('@/app/services/cloud/lawyerCommunityCloud');
                return deleteCommunityComment(postId, commentId, requesterId, requesterRole);
            }

            const toRemove = new Set<string>([commentId]);
            const stack = [commentId];
            while (stack.length) {
                const id = stack.pop()!;
                for (const c of post.comments) {
                    if (c.parentId === id && !toRemove.has(c.id)) {
                        toRemove.add(c.id);
                        stack.push(c.id);
                    }
                }
            }

            const { error } = await admin.from('forum_comments').delete().in('id', [...toRemove]);
            if (error) throw new Error(error.message);

            if (post.bestCommentId && toRemove.has(post.bestCommentId)) {
                await admin.from('forum_posts').update({ best_comment_id: null }).eq('id', postId);
            }

            const refreshed = await posts.getPostById(postId);
            if (!refreshed) throw new Error('المنشور غير موجود');
            return refreshed;
        },

        async editComment(
            postId: string,
            commentId: string,
            content: string,
            requesterId: string,
        ): Promise<CommunityPost> {
            const post = await posts.getPostById(postId);
            if (!post) throw new Error('المنشور غير موجود');
            const comment = post.comments.find((c) => c.id === commentId);
            if (!comment) throw new Error('التعليق غير موجود');
            if (comment.authorId !== requesterId) {
                throw new Error('ليس لديك صلاحية لتعديل هذا التعليق');
            }
            if (post.bestCommentId === commentId) {
                throw new Error('لا يمكن تعديل تعليق مميّز كأفضل إجابة');
            }
            const trimmed = content.trim();
            if (trimmed.length < 2) throw new Error('نص التعليق قصير جداً');
            if (trimmed.length > 5_000) throw new Error('نص التعليق طويل جداً');

            const admin = getForumSupabaseAdmin();
            if (!admin) {
                const { editCommunityComment } = await import('@/app/services/cloud/lawyerCommunityCloud');
                return editCommunityComment(postId, commentId, trimmed, requesterId);
            }

            const { error } = await admin
                .from('forum_comments')
                .update({ content: trimmed })
                .eq('id', commentId);
            if (error) throw new Error(error.message);

            const refreshed = await posts.getPostById(postId);
            if (!refreshed) throw new Error('المنشور غير موجود');
            return refreshed;
        },
    };
}

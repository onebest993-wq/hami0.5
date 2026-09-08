import { UserRole } from '@/app/types/admin-types';
import type { CommunityComment, CommunityPost } from '@/app/services/forum/forumTypes';
import { addCommunityComment, deleteCommunityComment, editCommunityComment } from '@/app/services/forum/forumCommunityRuntime';
import { sanitizeForumPostContent } from '@/app/services/forum/forumInputSecurity';
import {
    assertForumPostAcceptsComments,
    resolveForumReplyParentId,
} from '@/app/services/forum/forumCommentAddGuard';
import { loadForumSupabaseAdmin } from './loadForumSupabaseAdmin';

export type ForumPostReader = {
    getPostById(postId: string): Promise<CommunityPost | null>;
};

export function createForumCommentRepository(posts: ForumPostReader) {
    return {
        async addComment(postId: string, comment: CommunityComment): Promise<CommunityPost> {
            const existingPost = await posts.getPostById(postId);
            if (!existingPost) throw new Error('[forumRepo:postgres:opcode] المنشور غير موجود');
            assertForumPostAcceptsComments(existingPost);
            resolveForumReplyParentId(existingPost.comments, comment.parentId);

            const admin = await loadForumSupabaseAdmin();
            if (!admin) {
                await addCommunityComment(postId, comment);
                const post = await posts.getPostById(postId);
                if (!post) throw new Error('[forumRepo:postgres:opcode] المنشور غير موجود');
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

            const { error } = await admin.from('forum_comments').insert({
                id: comment.id,
                post_id: postId,
                author_id: comment.authorId,
                author_name: comment.authorName,
                content: comment.content,
                parent_id: comment.parentId ?? null,
                created_at: comment.createdAt,
            });
            if (error) throw new Error('[forumRepo:postgres:opcode] ' + (error.message));

            const post = await posts.getPostById(postId);
            if (!post) throw new Error('[forumRepo:postgres:opcode] المنشور غير موجود');

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
            if (!post) throw new Error('[forumRepo:postgres:opcode] المنشور غير موجود');
            const comment = post.comments.find((c) => c.id === commentId);
            if (!comment) throw new Error('[forumRepo:postgres:opcode] التعليق غير موجود');
            const isAdmin =
                requesterRole === UserRole.SUPER_ADMIN || requesterRole === UserRole.MODERATOR;
            if (comment.authorId !== requesterId && post.authorId !== requesterId && !isAdmin) {
                throw new Error('[forumRepo:postgres:opcode] ليس لديك صلاحية لحذف هذا التعليق');
            }

            const admin = await loadForumSupabaseAdmin();
            if (!admin) {
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
            if (error) throw new Error('[forumRepo:postgres:opcode] ' + (error.message));

            if (post.bestCommentId && toRemove.has(post.bestCommentId)) {
                await admin.from('forum_posts').update({ best_comment_id: null }).eq('id', postId);
            }

            const refreshed = await posts.getPostById(postId);
            if (!refreshed) throw new Error('[forumRepo:postgres:opcode] المنشور غير موجود');
            return refreshed;
        },

        async editComment(
            postId: string,
            commentId: string,
            content: string,
            requesterId: string,
        ): Promise<CommunityPost> {
            const post = await posts.getPostById(postId);
            if (!post) throw new Error('[forumRepo:postgres:opcode] المنشور غير موجود');
            const comment = post.comments.find((c) => c.id === commentId);
            if (!comment) throw new Error('[forumRepo:postgres:opcode] التعليق غير موجود');
            if (comment.authorId !== requesterId) {
                throw new Error('[forumRepo:postgres:opcode] ليس لديك صلاحية لتعديل هذا التعليق');
            }
            if (post.bestCommentId === commentId) {
                throw new Error('[forumRepo:postgres:opcode] لا يمكن تعديل تعليق مميّز كأفضل إجابة');
            }
            const trimmed = sanitizeForumPostContent(content);
            if (trimmed.length < 2) throw new Error('[forumRepo:postgres:opcode] نص التعليق قصير جداً');
            if (trimmed.length > 5_000) throw new Error('[forumRepo:postgres:opcode] نص التعليق طويل جداً');

            const admin = await loadForumSupabaseAdmin();
            if (!admin) {
                return editCommunityComment(postId, commentId, trimmed, requesterId);
            }

            const { error } = await admin
                .from('forum_comments')
                .update({ content: trimmed })
                .eq('id', commentId);
            if (error) throw new Error('[forumRepo:postgres:opcode] ' + (error.message));

            const refreshed = await posts.getPostById(postId);
            if (!refreshed) throw new Error('[forumRepo:postgres:opcode] المنشور غير موجود');
            return refreshed;
        },
    };
}

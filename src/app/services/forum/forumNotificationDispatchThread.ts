import type { CommunityComment, CommunityPost } from '@/app/services/forum/forumTypes';
import { ForumFollowRepository } from './forumFollowRepository';
import { ForumPostFollowRepository } from './forumPostFollowRepository';
import { collectForumParticipants, extractForumMentionIds } from './forumMentionUtils';
import { forumAuthorDisplayName } from './forumMapper';
import {
    forumNotificationSnippet as snippet,
    pushForumNotification as pushNotification,
} from './forumNotificationDispatchPush';

/** اشتراك تلقائي في النقاش عند التعليق — لتلقي الردود اللاحقة */
export async function autoSubscribeCommenterToThread(userId: string, postId: string): Promise<void> {
    if (!userId?.trim() || !postId?.trim()) return;
    try {
        const subscribed = await ForumPostFollowRepository.isSubscribed(userId, postId);
        if (!subscribed) {
            await ForumPostFollowRepository.subscribe(userId, postId);
        }
    } catch {
        /* silent */
    }
}

export async function dispatchContentMentions(params: {
    post: CommunityPost;
    content: string;
    authorId: string;
    authorName: string;
    contextLabel: 'منشور' | 'تعليق';
}): Promise<void> {
    const { post, content, authorId, authorName, contextLabel } = params;
    const participants = collectForumParticipants(post);
    const mentionedIds = extractForumMentionIds(content, participants);

    await Promise.allSettled(
        mentionedIds.map(async (userId) => {
            if (userId === authorId) return;
            await pushNotification(
                {
                    userId,
                    type: 'mention',
                    title: 'ذُكرت في المنتدى',
                    message: `${authorName} ذكرك في ${contextLabel}: ${snippet(content)}`,
                    postId: post.id,
                },
                `forum:mention:${post.id}:${authorId}:${userId}`,
            );
        }),
    );
}

export async function dispatchCommentNotifications(params: {
    post: CommunityPost;
    comment: CommunityComment;
    parentComment?: CommunityComment | null;
}): Promise<void> {
    const { post, comment, parentComment } = params;
    const postAuthorLabel = forumAuthorDisplayName(post);
    const isReply = Boolean(parentComment);
    const tasks: Promise<void>[] = [];

    await autoSubscribeCommenterToThread(comment.authorId, post.id);

    if (post.authorId !== comment.authorId) {
        tasks.push(
            pushNotification(
                {
                    userId: post.authorId,
                    type: 'comment',
                    title: 'تعليق جديد على منشورك',
                    message: `علق ${comment.authorName}: ${snippet(comment.content)}`,
                    postId: post.id,
                },
                `forum:comment-author:${post.id}:${comment.id}`,
            ),
        );
    }

    if (parentComment && parentComment.authorId !== comment.authorId) {
        tasks.push(
            pushNotification(
                {
                    userId: parentComment.authorId,
                    type: 'reply',
                    title: 'رد على تعليقك',
                    message: `رد ${comment.authorName}: ${snippet(comment.content)}`,
                    postId: post.id,
                },
                `forum:reply:${comment.id}:${parentComment.authorId}`,
            ),
        );
    }

    const followers = await ForumFollowRepository.getFollowers(post.authorId);
    for (const f of followers) {
        if (f.followerId === comment.authorId || f.followerId === post.authorId) continue;
        if (isReply) {
            if (!f.notifyReplies) continue;
        } else if (!f.notifyComments) {
            continue;
        }
        tasks.push(
            pushNotification(
                {
                    userId: f.followerId,
                    type: isReply ? 'reply' : 'comment',
                    title: isReply ? 'رد في نقاش تتابعه' : 'نشاط على محامٍ تتابعه',
                    message: isReply
                        ? `رد ${comment.authorName} في نقاش ${postAuthorLabel}`
                        : `علق ${comment.authorName} على منشور ${postAuthorLabel}`,
                    postId: post.id,
                },
                `forum:follow-activity:${post.id}:${comment.id}:${f.followerId}`,
            ),
        );
    }

    const postSubscribers = await ForumPostFollowRepository.getSubscribers(post.id);
    for (const sub of postSubscribers) {
        if (sub.userId === comment.authorId || sub.userId === post.authorId) continue;
        if (parentComment && sub.userId === parentComment.authorId) continue;
        tasks.push(
            pushNotification(
                {
                    userId: sub.userId,
                    type: isReply ? 'reply' : 'comment',
                    title: isReply ? 'رد جديد في نقاش تتابعه' : 'تعليق جديد في نقاش تتابعه',
                    message: `${comment.authorName}: ${snippet(comment.content)}`,
                    postId: post.id,
                },
                `forum:post-sub:${post.id}:${comment.id}:${sub.userId}`,
            ),
        );
    }

    tasks.push(
        dispatchContentMentions({
            post,
            content: comment.content,
            authorId: comment.authorId,
            authorName: comment.authorName,
            contextLabel: 'تعليق',
        }),
    );

    await Promise.allSettled(tasks);
}

export async function dispatchPostUpvoteNotification(params: {
    post: CommunityPost;
    voterId: string;
}): Promise<void> {
    const { post, voterId } = params;
    if (post.authorId === voterId) return;
    if (!post.upvoterIds?.includes(voterId)) return;
    await pushNotification(
        {
            userId: post.authorId,
            type: 'upvote',
            title: 'تصويت إيجابي على منشورك',
            message: `حصل منشورك على تصويت جديد — ${snippet(post.content)}`,
            postId: post.id,
        },
        `forum:upvote:${post.id}:${voterId}`,
    );
}

export async function dispatchBestAnswerNotification(params: {
    post: CommunityPost;
    comment: CommunityComment;
}): Promise<void> {
    const { post, comment } = params;
    if (comment.authorId === post.authorId) return;
    await pushNotification(
        {
            userId: comment.authorId,
            type: 'best_answer',
            title: 'تم اعتماد إجابتك',
            message: `اختار ${forumAuthorDisplayName(post)} تعليقك كأفضل إجابة`,
            postId: post.id,
        },
        `forum:best:${post.id}:${comment.id}`,
    );
}

export async function dispatchCommentUpvoteNotification(params: {
    postId: string;
    commentAuthorId: string;
    commentSnippet: string;
    voterId: string;
}): Promise<void> {
    const { postId, commentAuthorId, commentSnippet, voterId } = params;
    if (commentAuthorId === voterId) return;
    await pushNotification(
        {
            userId: commentAuthorId,
            type: 'upvote',
            title: 'تصويت إيجابي على تعليقك',
            message: `حصل تعليقك على تصويت — ${snippet(commentSnippet)}`,
            postId,
        },
        `forum:comment-upvote:${postId}:${voterId}:${commentAuthorId}`,
    );
}

export async function dispatchReportOutcomeNotification(params: {
    reporterId: string;
    postId: string;
    outcome: 'dismissed' | 'removed';
}): Promise<void> {
    const { reporterId, postId, outcome } = params;
    const title = outcome === 'removed' ? 'تمت معالجة بلاغك' : 'تمت مراجعة بلاغك';
    const message =
        outcome === 'removed'
            ? 'أزالت الإدارة المحتوى المُبلَّغ عنه'
            : 'رُاجع بلاغك ولم تُتخذ إجراءات إضافية';
    await pushNotification(
        {
            userId: reporterId,
            type: 'report_update',
            title,
            message,
            postId,
        },
        `forum:report-outcome:${postId}:${reporterId}:${outcome}`,
    );
}

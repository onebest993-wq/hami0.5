import type {
    CommunityComment,
    CommunityPost,
} from '@/app/services/forum/forumTypes';
import { ForumFollowRepository } from './forumFollowRepository';
import { ForumPostFollowRepository } from './forumPostFollowRepository';
import { ForumGroupRepository } from './forumGroupRepository';
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

export async function dispatchNewFollowerNotification(params: {
    followerId: string;
    followerName: string;
    followingId: string;
}): Promise<void> {
    const { followerId, followerName, followingId } = params;
    if (followerId === followingId) return;
    try {
        const { ForumMuteRepository } = await import('./forumMuteRepository');
        if (await ForumMuteRepository.isMutedBy(followingId, followerId)) return;
    } catch {
        /* fail-open: عطل فحص الكتم لا يحجب إشعار المتابعة */
    }
    await pushNotification(
        {
            userId: followingId,
            type: 'follow',
            title: 'متابع جديد',
            message: `بدأ ${followerName} متابعتك في المنتدى`,
        },
        `forum:follow:${followingId}:${followerId}`,
    );
}

export async function dispatchFollowedUserNewPost(params: {
    authorId: string;
    authorName: string;
    post: CommunityPost;
}): Promise<void> {
    const { authorId, authorName, post } = params;
    const displayAuthor = post.isAnonymous ? forumAuthorDisplayName(post) : authorName;
    const followers = await ForumFollowRepository.getFollowers(authorId);
    await Promise.allSettled(
        followers.map(async (f) => {
            if (f.followerId === authorId || !f.notifyPosts) return;
            await pushNotification(
                {
                    userId: f.followerId,
                    type: 'new_post',
                    title: post.groupId ? 'منشور جديد في مجموعة من محامٍ تتابعه' : 'منشور جديد من محامٍ تتابعه',
                    message: `نشر ${displayAuthor}: ${snippet(post.content)}`,
                    postId: post.id,
                },
                `forum:new-post:${post.id}:${f.followerId}`,
            );
        }),
    );

    if (post.groupId) {
        await dispatchGroupNewPostNotification({ post, authorName: displayAuthor });
    }
    await dispatchContentMentions({
        post,
        content: post.content,
        authorId,
        authorName: displayAuthor,
        contextLabel: 'منشور',
    });
}

export async function dispatchFollowedUserNewDocument(params: {
    authorId: string;
    title: string;
    message: string;
    docId?: string;
}): Promise<void> {
    const { authorId, title, message, docId } = params;
    const followers = await ForumFollowRepository.getFollowers(authorId);
    await Promise.allSettled(
        followers.map(async (f) => {
            if (f.followerId === authorId || !f.notifyPosts) return;
            await pushNotification(
                {
                    userId: f.followerId,
                    type: 'new_document',
                    title,
                    message,
                    postId: docId,
                },
                docId ? `forum:new-doc:${docId}:${f.followerId}` : `forum:new-doc:${authorId}:${f.followerId}:${Date.now()}`,
            );
        }),
    );
}

export async function dispatchGroupNewPostNotification(params: {
    post: CommunityPost;
    authorName: string;
}): Promise<void> {
    const { post, authorName } = params;
    const groupId = post.groupId?.trim();
    if (!groupId) return;

    const memberIds = await ForumGroupRepository.listMemberIds(groupId);
    const group = await ForumGroupRepository.getGroup(groupId, null);
    const groupName = group?.name ?? 'مجموعة';

    await Promise.allSettled(
        memberIds.map(async (memberId) => {
            if (memberId === post.authorId) return;
            await pushNotification(
                {
                    userId: memberId,
                    type: 'new_post',
                    title: `منشور جديد في ${groupName}`,
                    message: `${authorName}: ${snippet(post.content)}`,
                    postId: post.id,
                },
                `forum:group-post:${groupId}:${post.id}:${memberId}`,
            );
        }),
    );
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

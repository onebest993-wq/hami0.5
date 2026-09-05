import type { CommunityPost } from '@/app/services/forum/forumTypes';
import { ForumFollowRepository } from './forumFollowRepository';
import { ForumGroupRepository } from './forumGroupRepository';
import { forumAuthorDisplayName } from './forumMapper';
import {
    forumNotificationSnippet as snippet,
    pushForumNotification as pushNotification,
} from './forumNotificationDispatchPush';
import { dispatchContentMentions } from './forumNotificationDispatchThread';

export {
    autoSubscribeCommenterToThread,
    dispatchBestAnswerNotification,
    dispatchCommentNotifications,
    dispatchCommentUpvoteNotification,
    dispatchContentMentions,
    dispatchPostUpvoteNotification,
    dispatchReportOutcomeNotification,
} from './forumNotificationDispatchThread';

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
                docId
                    ? `forum:new-doc:${docId}:${f.followerId}`
                    : `forum:new-doc:${authorId}:${f.followerId}:${Date.now()}`,
            );
        }),
    );
}

/** استخدام داخلي فقط ضمن هذا الملف — لا export علني (لا مستهلكين خارجيين). */
async function dispatchGroupNewPostNotification(params: {
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

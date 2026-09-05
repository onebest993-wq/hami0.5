import { SecureAPIClient, SecureFetchError, getCurrentAccessToken } from '@/app/services/SecureAPIClient';
import { sanitizeForumPostContent, sanitizeForumTagsInput } from '@/app/services/forum/forumInputSecurity';
import { sanitizeCommunityPostForCreate } from '@/app/services/forum/forumPostCreateGuard';
import {
    forumApiPostJson,
    hasForumRemoteSession,
    parseForumApiError,
    persistForumPostLocally,
    sliceForumPostsPage,
    shouldPersistMergedForumPosts,
    type ForumApiOk,
} from '@/app/services/forum/forumApi/forumApiClientCore';
import type { CommunityPost } from '@/app/services/cloud/lawyerCommunityTypes';
import {
    CommunityDB,
    filterDeletedCommunityPosts,
    getDeletedCommunityPostIds,
    mergeCommunityPostsById,
    sortCommunityPosts,
} from '@/app/services/forum/forumCommunityRuntime';
import {
    deleteForumPost,
    getForumPostById,
    isForumUserBanned,
    listForumBookmarks,
    reportForumPost,
    syncForumPost,
    toggleForumBookmark,
    toggleForumLockDiscussion,
    toggleForumPin,
    updateForumPost,
} from '@/app/services/forum/forumApi/forumApiPosts';
import {
    lazyAddForumComment,
    lazyCreateForumGroup,
    lazyCreateForumRepositoryDocument,
    lazyDeleteForumComment,
    lazyDeleteForumRepositoryDocument,
    lazyDismissForumNotification,
    lazyEditForumComment,
    lazyFollowForumUser,
    lazyGetForumFollowerCount,
    lazyJoinForumGroup,
    lazyLeaveForumGroup,
    lazyListForumFollowers,
    lazyListForumFollowing,
    lazyListForumGroups,
    lazyListForumNotifications,
    lazyListForumPostSubscriptions,
    lazyListForumRepositoryDocuments,
    lazyMarkAllForumNotificationsRead,
    lazyMarkForumNotificationRead,
    lazyReportForumComment,
    lazySearchForumCommunity,
    lazyToggleForumCommentUpvote,
    lazyToggleForumPostSubscription,
    lazyUnfollowForumUser,
    lazyUpdateForumFollowPreferences,
    lazyUpdateForumRepositoryDocument,
} from '@/app/services/forum/forumApi/forumApiServiceLazy';

type ApiOk<T> = ForumApiOk<T>;
type PostsListResponse = { ok: boolean; posts: CommunityPost[]; total: number };

/**
 * واجهة المنتدى العامة — المنشورات الأساسية هنا (SecureAPIClient + /api/forum/)
 * وبقية المجالات في forum/forumApi/*.
 */
export class ForumApiService {
    static async listPostsPaginated(
        limit: number,
        offset: number,
        options?: { groupId?: string },
    ): Promise<{ posts: CommunityPost[]; total: number }> {
        const localAll = sortCommunityPosts(await CommunityDB.listPosts());
        const scopedLocal = options?.groupId
            ? localAll.filter((p) => p.groupId === options.groupId)
            : localAll.filter((p) => !p.groupId);
        const deletedIds = await getDeletedCommunityPostIds();

        if (!(await getCurrentAccessToken())) {
            return sliceForumPostsPage(scopedLocal, limit, offset);
        }

        const groupQuery = options?.groupId
            ? `&groupId=${encodeURIComponent(options.groupId)}`
            : '';
        try {
            const res = await SecureAPIClient.fetchSecure<PostsListResponse>(
                `/api/forum/posts?limit=${limit}&offset=${offset}${groupQuery}`,
                { method: 'GET' },
            );
            if (!res.ok) throw new Error('تعذّر جلب المنشورات');
            const remote = sortCommunityPosts(
                filterDeletedCommunityPosts(res.posts, deletedIds),
            );
            const merged = sortCommunityPosts(mergeCommunityPostsById(scopedLocal, remote));
            if (shouldPersistMergedForumPosts(scopedLocal, merged)) {
                await CommunityDB.persistPostsBatch(merged);
            }
            return sliceForumPostsPage(merged, limit, offset);
        } catch (err) {
            if (err instanceof SecureFetchError && err.status === 401) {
                return sliceForumPostsPage(scopedLocal, limit, offset);
            }
            if (err instanceof SecureFetchError && err.status === 403) {
                throw err;
            }
            return sliceForumPostsPage(scopedLocal, limit, offset);
        }
    }

    static async createPost(post: CommunityPost): Promise<CommunityPost> {
        if (!(await hasForumRemoteSession())) {
            throw new SecureFetchError(
                'يجب تسجيل الدخول بحساب حقيقي للمشاركة في المنتدى',
                401,
                '',
                '/api/forum/posts',
            );
        }

        let attachment = post.attachment;
        const storagePath = attachment?.storagePath?.trim() ?? '';
        const hasCloudAttachment = Boolean(storagePath) && !storagePath.startsWith('idb:forum:');
        if (attachment && post.authorId && !hasCloudAttachment) {
            const { prepareForumAttachmentForPublish } = await import(
                '@/app/services/forumAttachmentService'
            );
            attachment = await prepareForumAttachmentForPublish(attachment, post.authorId);
        }

        const safePost = sanitizeCommunityPostForCreate(
            {
                ...post,
                attachment,
                content: sanitizeForumPostContent(String(post.content ?? '')),
                tags: Array.isArray(post.tags)
                    ? post.tags.map((tag) => sanitizeForumTagsInput(String(tag))).filter(Boolean)
                    : [],
            },
            post.authorId,
        );

        const res = await forumApiPostJson<ApiOk<{ post: CommunityPost }>>('/api/forum/posts', {
            action: 'create',
            post: safePost,
        }).catch((err: unknown) => {
            throw new Error(parseForumApiError(err) || 'تعذّر نشر المنشور');
        });
        if (!res.post) throw new Error('استجابة غير صالحة');
        const reconciled = {
            ...res.post,
            attachment: res.post.attachment ?? safePost.attachment ?? null,
        };
        await persistForumPostLocally(reconciled);
        void import('@/app/services/auditLogPublisher')
            .then(({ AuditLog }) => {
                AuditLog.forum.questionPosted({
                    questionId: String(reconciled.id ?? safePost.id ?? ''),
                    title: String(safePost.content.slice(0, 80) || 'سؤال'),
                });
            })
            .catch(() => undefined);
        return reconciled;
    }

    static syncPost = syncForumPost;
    static getPostById = getForumPostById;
    static deletePost = deleteForumPost;
    static togglePin = toggleForumPin;
    static reportPost = reportForumPost;
    static updatePost = updateForumPost;
    static isUserBanned = isForumUserBanned;
    static listBookmarks = listForumBookmarks;
    static toggleBookmark = toggleForumBookmark;
    static toggleLockDiscussion = toggleForumLockDiscussion;

    static addComment = lazyAddForumComment;
    static deleteComment = lazyDeleteForumComment;
    static editComment = lazyEditForumComment;
    static toggleCommentUpvote = lazyToggleForumCommentUpvote;
    static reportComment = lazyReportForumComment;

    static listGroups = lazyListForumGroups;
    static createGroup = lazyCreateForumGroup;
    static joinGroup = lazyJoinForumGroup;
    static leaveGroup = lazyLeaveForumGroup;

    static listFollowing = lazyListForumFollowing;
    static followUser = lazyFollowForumUser;
    static unfollowUser = lazyUnfollowForumUser;
    static updateFollowPreferences = lazyUpdateForumFollowPreferences;
    static getFollowerCount = lazyGetForumFollowerCount;
    static listFollowers = lazyListForumFollowers;
    static listPostSubscriptions = lazyListForumPostSubscriptions;
    static togglePostSubscription = lazyToggleForumPostSubscription;

    static listForumNotifications = lazyListForumNotifications;
    static markForumNotificationRead = lazyMarkForumNotificationRead;
    static markAllForumNotificationsRead = lazyMarkAllForumNotificationsRead;
    static dismissForumNotification = lazyDismissForumNotification;

    static searchCommunity = lazySearchForumCommunity;
    static listRepositoryDocuments = lazyListForumRepositoryDocuments;
    static createRepositoryDocument = lazyCreateForumRepositoryDocument;
    static updateRepositoryDocument = lazyUpdateForumRepositoryDocument;
    static deleteRepositoryDocument = lazyDeleteForumRepositoryDocument;
}

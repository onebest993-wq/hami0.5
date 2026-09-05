import type { ForumGroup } from '@/app/services/forum/forumGroupTypes';
import type { ForumCommunitySearchQuery } from '@/app/services/forum/forumApi/forumApiSearch';
import type { RepositoryDocument } from '@/app/services/lawyer-cloud';

type ForumCommentsMod = typeof import('@/app/services/forum/forumApi/forumApiComments');
type ForumSocialMod = typeof import('@/app/services/forum/forumApi/forumApiSocial');
type ForumNotificationsMod = typeof import('@/app/services/forum/forumApi/forumApiNotifications');

function loadForumComments() {
    return import('@/app/services/forum/forumApi/forumApiComments');
}

function loadForumSocial() {
    return import('@/app/services/forum/forumApi/forumApiSocial');
}

function loadForumNotifications() {
    return import('@/app/services/forum/forumApi/forumApiNotifications');
}

/** مجموعات/بحث/مستودع — ليست على أول تقييم لواجهة المنشورات */
export async function lazyListForumGroups(query = ''): Promise<ForumGroup[]> {
    const { listForumGroups } = await import('@/app/services/forum/forumApi/forumApiGroups');
    return listForumGroups(query);
}

export async function lazyCreateForumGroup(
    input: {
        name: string;
        description: string;
        coverImage?: string | null;
        isOfficial?: boolean;
    },
    requesterId?: string | null,
): Promise<ForumGroup> {
    const { createForumGroup } = await import('@/app/services/forum/forumApi/forumApiGroups');
    return createForumGroup(input, requesterId);
}

export async function lazyJoinForumGroup(
    groupId: string,
    requesterId?: string | null,
): Promise<ForumGroup> {
    const { joinForumGroup } = await import('@/app/services/forum/forumApi/forumApiGroups');
    return joinForumGroup(groupId, requesterId);
}

export async function lazyLeaveForumGroup(
    groupId: string,
    requesterId?: string | null,
): Promise<void> {
    const { leaveForumGroup } = await import('@/app/services/forum/forumApi/forumApiGroups');
    return leaveForumGroup(groupId, requesterId);
}

export async function lazySearchForumCommunity(query: ForumCommunitySearchQuery) {
    const { searchForumCommunity } = await import('@/app/services/forum/forumApi/forumApiSearch');
    return searchForumCommunity(query);
}

export async function lazyListForumRepositoryDocuments(): Promise<RepositoryDocument[]> {
    const { listForumRepositoryDocuments } = await import(
        '@/app/services/forum/forumApi/forumApiRepository'
    );
    return listForumRepositoryDocuments();
}

export async function lazyCreateForumRepositoryDocument(
    document: RepositoryDocument,
): Promise<RepositoryDocument> {
    const { createForumRepositoryDocument } = await import(
        '@/app/services/forum/forumApi/forumApiRepository'
    );
    return createForumRepositoryDocument(document);
}

export async function lazyUpdateForumRepositoryDocument(
    docId: string,
    document: RepositoryDocument,
): Promise<RepositoryDocument> {
    const { updateForumRepositoryDocument } = await import(
        '@/app/services/forum/forumApi/forumApiRepository'
    );
    return updateForumRepositoryDocument(docId, document);
}

export async function lazyDeleteForumRepositoryDocument(docId: string): Promise<void> {
    const { deleteForumRepositoryDocument } = await import(
        '@/app/services/forum/forumApi/forumApiRepository'
    );
    return deleteForumRepositoryDocument(docId);
}

export async function lazyAddForumComment(
    ...args: Parameters<ForumCommentsMod['addForumComment']>
): ReturnType<ForumCommentsMod['addForumComment']> {
    const m = await loadForumComments();
    return m.addForumComment(...args);
}

export async function lazyDeleteForumComment(
    ...args: Parameters<ForumCommentsMod['deleteForumComment']>
): ReturnType<ForumCommentsMod['deleteForumComment']> {
    const m = await loadForumComments();
    return m.deleteForumComment(...args);
}

export async function lazyEditForumComment(
    ...args: Parameters<ForumCommentsMod['editForumComment']>
): ReturnType<ForumCommentsMod['editForumComment']> {
    const m = await loadForumComments();
    return m.editForumComment(...args);
}

export async function lazyToggleForumCommentUpvote(
    ...args: Parameters<ForumCommentsMod['toggleForumCommentUpvote']>
): ReturnType<ForumCommentsMod['toggleForumCommentUpvote']> {
    const m = await loadForumComments();
    return m.toggleForumCommentUpvote(...args);
}

export async function lazyReportForumComment(
    ...args: Parameters<ForumCommentsMod['reportForumComment']>
): ReturnType<ForumCommentsMod['reportForumComment']> {
    const m = await loadForumComments();
    return m.reportForumComment(...args);
}

export async function lazyListForumFollowing(
    ...args: Parameters<ForumSocialMod['listForumFollowing']>
): ReturnType<ForumSocialMod['listForumFollowing']> {
    const m = await loadForumSocial();
    return m.listForumFollowing(...args);
}

export async function lazyFollowForumUser(
    ...args: Parameters<ForumSocialMod['followForumUser']>
): ReturnType<ForumSocialMod['followForumUser']> {
    const m = await loadForumSocial();
    return m.followForumUser(...args);
}

export async function lazyUnfollowForumUser(
    ...args: Parameters<ForumSocialMod['unfollowForumUser']>
): ReturnType<ForumSocialMod['unfollowForumUser']> {
    const m = await loadForumSocial();
    return m.unfollowForumUser(...args);
}

export async function lazyUpdateForumFollowPreferences(
    ...args: Parameters<ForumSocialMod['updateForumFollowPreferences']>
): ReturnType<ForumSocialMod['updateForumFollowPreferences']> {
    const m = await loadForumSocial();
    return m.updateForumFollowPreferences(...args);
}

export async function lazyGetForumFollowerCount(
    ...args: Parameters<ForumSocialMod['getForumFollowerCount']>
): ReturnType<ForumSocialMod['getForumFollowerCount']> {
    const m = await loadForumSocial();
    return m.getForumFollowerCount(...args);
}

export async function lazyListForumFollowers(
    ...args: Parameters<ForumSocialMod['listForumFollowers']>
): ReturnType<ForumSocialMod['listForumFollowers']> {
    const m = await loadForumSocial();
    return m.listForumFollowers(...args);
}

export async function lazyListForumPostSubscriptions(
    ...args: Parameters<ForumSocialMod['listForumPostSubscriptions']>
): ReturnType<ForumSocialMod['listForumPostSubscriptions']> {
    const m = await loadForumSocial();
    return m.listForumPostSubscriptions(...args);
}

export async function lazyToggleForumPostSubscription(
    ...args: Parameters<ForumSocialMod['toggleForumPostSubscription']>
): ReturnType<ForumSocialMod['toggleForumPostSubscription']> {
    const m = await loadForumSocial();
    return m.toggleForumPostSubscription(...args);
}

export async function lazyListForumNotifications(
    ...args: Parameters<ForumNotificationsMod['listForumNotifications']>
): ReturnType<ForumNotificationsMod['listForumNotifications']> {
    const m = await loadForumNotifications();
    return m.listForumNotifications(...args);
}

export async function lazyMarkForumNotificationRead(
    ...args: Parameters<ForumNotificationsMod['markForumNotificationRead']>
): ReturnType<ForumNotificationsMod['markForumNotificationRead']> {
    const m = await loadForumNotifications();
    return m.markForumNotificationRead(...args);
}

export async function lazyMarkAllForumNotificationsRead(
    ...args: Parameters<ForumNotificationsMod['markAllForumNotificationsRead']>
): ReturnType<ForumNotificationsMod['markAllForumNotificationsRead']> {
    const m = await loadForumNotifications();
    return m.markAllForumNotificationsRead(...args);
}

export async function lazyDismissForumNotification(
    ...args: Parameters<ForumNotificationsMod['dismissForumNotification']>
): ReturnType<ForumNotificationsMod['dismissForumNotification']> {
    const m = await loadForumNotifications();
    return m.dismissForumNotification(...args);
}

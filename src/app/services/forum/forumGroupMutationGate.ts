import { canViewForumGroupPost } from '@/app/services/forum/forumBffAccessPolicy';
import { ForumGroupRepository } from '@/app/services/forum/forumGroupRepository';
import type { CommunityPost } from '@/app/services/forum/forumTypes';

/**
 * يفرض عضوية المجموعة قبل أي طفرة/تفاعل على منشور مجموعة —
 * يمنع تسريب محتوى المجموعات الخاصة عبر comment/update/delete/sync.
 */
export async function assertForumPostGroupAccess(
    post: Pick<CommunityPost, 'groupId'>,
    userId: string,
    isAdmin: boolean,
): Promise<void> {
    if (!post.groupId) return;
    const isMember = await ForumGroupRepository.isMember(post.groupId, userId);
    if (!canViewForumGroupPost(post, isMember, isAdmin)) {
        throw new Error('[forum:guard:group_membership_required] يجب الانضمام للمجموعة قبل التفاعل مع منشوراتها');
    }
}

import type { CommunityPost } from '@/app/services/lawyer-cloud';

/**
 * سياسات وصول BFF — defense-in-depth فوق service-role.
 * كل مسار API يجب أن يمرّ عبر هذه الفحوص قبل ForumRepository.
 */

export function canViewForumGroupPost(
    post: Pick<CommunityPost, 'groupId'>,
    isMember: boolean,
    isAdmin: boolean,
): boolean {
    if (!post.groupId) return true;
    return isMember || isAdmin;
}

export function canMutateForumPostFields(
    existing: CommunityPost,
    requesterId: string,
    isAdmin: boolean,
): boolean {
    return existing.authorId === requesterId || isAdmin;
}

export function assertForumGroupWriteAccess(
    groupId: string | null | undefined,
    isMember: boolean,
    isAdmin: boolean,
): void {
    if (!groupId) return;
    if (!isMember && !isAdmin) {
        throw new Error('يجب الانضمام للمجموعة قبل النشر فيها');
    }
}

import type { CommunityComment, CommunityPost } from '@/app/services/lawyer-cloud';

export function getPostAuthorId(post: CommunityPost): string {
    return post.authorId || post.author_id || '';
}

export function getCommentAuthorId(comment: CommunityComment): string {
    return comment.authorId || comment.author_id || '';
}

export function canEditPost(
    post: CommunityPost,
    currentUserId: string | null,
    isAdmin = false,
): boolean {
    if (!currentUserId) return false;
    if (isAdmin) return true;
    return getPostAuthorId(post) === currentUserId;
}

export function canDeletePost(
    post: CommunityPost,
    currentUserId: string | null,
    isAdmin: boolean,
): boolean {
    if (!currentUserId) return false;
    if (isAdmin) return true;
    return getPostAuthorId(post) === currentUserId;
}

export function canPinPost(isAdmin: boolean): boolean {
    return isAdmin;
}

export function canDeleteComment(
    post: CommunityPost,
    comment: CommunityComment,
    currentUserId: string | null,
    isAdmin: boolean,
): boolean {
    if (!currentUserId) return false;
    if (isAdmin) return true;
    if (getCommentAuthorId(comment) === currentUserId) return true;
    if (getPostAuthorId(post) === currentUserId) return true;
    return false;
}

export function canEditComment(
    comment: CommunityComment,
    currentUserId: string | null,
    post?: CommunityPost,
): boolean {
    if (!currentUserId) return false;
    if (getCommentAuthorId(comment) !== currentUserId) return false;
    // قفل النص بعد تمييزه كأفضل إجابة (يحمي مالك المنشور من تبديل المحتوى)
    if (post && post.bestCommentId === comment.id) return false;
    return true;
}

export function canAddComment(
    post: CommunityPost,
    currentUserId: string | null,
    isBanned: boolean,
): boolean {
    if (!currentUserId || isBanned) return false;
    if (post.isLocked === true) return false;
    return true;
}

export function canUpvotePost(post: CommunityPost, currentUserId: string | null): boolean {
    if (!currentUserId) return false;
    return getPostAuthorId(post) !== currentUserId;
}

/** متابعة النقاش للتنبيهات — للمشاهدين فقط، لا لصاحب المنشور */
export function canFollowThread(post: CommunityPost, currentUserId: string | null): boolean {
    if (!currentUserId) return false;
    return getPostAuthorId(post) !== currentUserId;
}

/** كتم مستخدم — ليس لنفسك ولا لمؤلف مجهول الهوية على البطاقة */
export function canMutePostAuthor(
    post: CommunityPost,
    currentUserId: string | null,
): boolean {
    if (!currentUserId) return false;
    if (post.isAnonymous === true) return false;
    return getPostAuthorId(post) !== currentUserId;
}

/** متابعة مؤلف المنشور — ليس لنفسك ولا للمجهول */
export function canFollowPostAuthor(
    post: CommunityPost,
    currentUserId: string | null,
): boolean {
    if (!currentUserId) return false;
    if (post.isAnonymous === true) return false;
    return getPostAuthorId(post) !== currentUserId;
}


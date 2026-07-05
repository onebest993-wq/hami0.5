import type { CommunityPost } from '@/app/services/forum/forumTypes';

/** مدة أولوية «الاستشارة العاجلة» في الترتيب (24 ساعة من وقت النشر). */
export const URGENT_CONSULTATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export const URGENT_CONSULTATION_LABEL = 'الاستشارة العاجلة';
export const URGENT_CONSULTATION_BADGE = 'عاجلة';
export const URGENT_CONSULTATION_HINT =
    'تُعرض في مقدمة المقترحات لمدة 24 ساعة ثم تصبح استشارة عادية';

type UrgentPostFields = Pick<CommunityPost, 'isUrgent' | 'createdAt'>;

export function isUrgentConsultationPost(post: UrgentPostFields): boolean {
    return post.isUrgent === true;
}

export function isActiveUrgentConsultation(
    post: UrgentPostFields,
    nowMs: number = Date.now(),
): boolean {
    if (!isUrgentConsultationPost(post)) return false;
    const created = Date.parse(post.createdAt);
    if (!Number.isFinite(created)) return false;
    return nowMs - created < URGENT_CONSULTATION_WINDOW_MS;
}

export function getActiveUrgentConsultationPriority(
    post: UrgentPostFields,
    nowMs: number = Date.now(),
): number {
    return isActiveUrgentConsultation(post, nowMs) ? 1 : 0;
}

export function compareCommunityPostsForFeed(
    a: CommunityPost,
    b: CommunityPost,
    nowMs: number = Date.now(),
): number {
    const aPin = a.isPinned ? 1 : 0;
    const bPin = b.isPinned ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;

    const aUrg = getActiveUrgentConsultationPriority(a, nowMs);
    const bUrg = getActiveUrgentConsultationPriority(b, nowMs);
    if (aUrg !== bUrg) return bUrg - aUrg;

    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

export function compareCommunityPostsByUpvotes(
    a: CommunityPost,
    b: CommunityPost,
    nowMs: number = Date.now(),
): number {
    const aPin = a.isPinned ? 1 : 0;
    const bPin = b.isPinned ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;

    const aUrg = getActiveUrgentConsultationPriority(a, nowMs);
    const bUrg = getActiveUrgentConsultationPriority(b, nowMs);
    if (aUrg !== bUrg) return bUrg - aUrg;

    return (
        b.upvoterIds.length - a.upvoterIds.length ||
        Date.parse(b.createdAt) - Date.parse(a.createdAt)
    );
}

export function hasAnyActiveUrgentConsultation(
    posts: readonly UrgentPostFields[],
    nowMs: number = Date.now(),
): boolean {
    return posts.some((post) => isActiveUrgentConsultation(post, nowMs));
}

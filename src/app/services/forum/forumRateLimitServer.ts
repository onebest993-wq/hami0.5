type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function check(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const entry = buckets.get(key);
    if (!entry || now > entry.resetAt) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }
    entry.count += 1;
    return entry.count <= max;
}

/** حد معدّل على السيرفر لمسارات المنتدى (per userId). */
export function checkForumActionRateLimit(
    userId: string,
    action: 'post' | 'comment' | 'report' | 'upvote',
    opts?: { postId?: string },
): boolean {
    if (!userId) return false;
    switch (action) {
        case 'post':
            return true;
        case 'comment':
            return (
                check(`forum:comment:burst:${userId}`, 1, 8_000) &&
                check(`forum:comment:min:${userId}`, 30, 60_000)
            );
        case 'report':
            return check(`forum:report:${userId}:${opts?.postId ?? 'any'}`, 1, 24 * 60 * 60_000);
        case 'upvote':
            return check(`forum:upvote:min:${userId}`, 60, 60_000);
        default:
            return true;
    }
}

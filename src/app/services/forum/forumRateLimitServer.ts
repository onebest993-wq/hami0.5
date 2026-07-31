import { consumeRateLimitSlot } from '@/app/api/security/wifeRateLimitStore';

export type ForumRateAction =
    | 'post'
    | 'comment'
    | 'report'
    | 'upvote'
    | 'delete'
    | 'update'
    | 'lock'
    | 'follow'
    | 'group_join'
    | 'bookmark'
    | 'mute'
    | 'comment_mutate';

type RateLimitRule = {
    scope: string;
    maxRequests: number;
    windowMs: number;
};

function buildRateLimitKey(userId: string, action: ForumRateAction, postId?: string): string {
    if (action === 'report') return `${userId}:${postId ?? 'any'}`;
    return userId;
}

function rulesForAction(action: ForumRateAction): RateLimitRule[] {
    switch (action) {
        case 'post':
            return [{ scope: 'forum:post:burst', maxRequests: 1, windowMs: 30_000 }];
        case 'comment':
            return [
                { scope: 'forum:comment:burst', maxRequests: 1, windowMs: 8_000 },
                { scope: 'forum:comment:min', maxRequests: 30, windowMs: 60_000 },
            ];
        case 'report':
            return [{ scope: 'forum:report', maxRequests: 1, windowMs: 24 * 60 * 60_000 }];
        case 'upvote':
            return [{ scope: 'forum:upvote:min', maxRequests: 60, windowMs: 60_000 }];
        case 'delete':
            return [{ scope: 'forum:delete:min', maxRequests: 20, windowMs: 60_000 }];
        case 'update':
            return [{ scope: 'forum:update:min', maxRequests: 30, windowMs: 60_000 }];
        case 'lock':
            return [{ scope: 'forum:lock:min', maxRequests: 30, windowMs: 60_000 }];
        case 'follow':
            return [
                { scope: 'forum:follow:burst', maxRequests: 5, windowMs: 10_000 },
                { scope: 'forum:follow:min', maxRequests: 40, windowMs: 60_000 },
            ];
        case 'group_join':
            return [{ scope: 'forum:group_join:min', maxRequests: 20, windowMs: 60_000 }];
        case 'bookmark':
            return [{ scope: 'forum:bookmark:min', maxRequests: 60, windowMs: 60_000 }];
        case 'mute':
            return [{ scope: 'forum:mute:min', maxRequests: 30, windowMs: 60_000 }];
        case 'comment_mutate':
            return [{ scope: 'forum:comment_mutate:min', maxRequests: 40, windowMs: 60_000 }];
        default:
            return [];
    }
}

/** حد معدّل على السيرفر — Redis عند التوفر، ذاكرة محلية في التطوير. */
export async function checkForumActionRateLimit(
    userId: string,
    action: ForumRateAction,
    opts?: { postId?: string },
): Promise<boolean> {
    if (!userId) return false;

    const subjectKey = buildRateLimitKey(userId, action, opts?.postId);
    for (const rule of rulesForAction(action)) {
        const allowed = await consumeRateLimitSlot(subjectKey, {
            scope: rule.scope,
            maxRequests: rule.maxRequests,
            windowMs: rule.windowMs,
        });
        if (!allowed) return false;
    }
    return true;
}

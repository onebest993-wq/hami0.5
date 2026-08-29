const STORAGE_PREFIX = 'hami:forum:rate:';

type RateBucket = { timestamps: number[] };

function readBucket(key: string): RateBucket {
    if (typeof window === 'undefined') return { timestamps: [] };
    try {
        const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (!raw) return { timestamps: [] };
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as RateBucket).timestamps)) {
            return { timestamps: [] };
        }
        return { timestamps: (parsed as RateBucket).timestamps.filter((t) => typeof t === 'number') };
    } catch {
        return { timestamps: [] };
    }
}

function writeBucket(key: string, bucket: RateBucket): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(bucket));
    } catch {
        /* ignore quota */
    }
}

function prune(timestamps: number[], windowMs: number): number[] {
    const cutoff = Date.now() - windowMs;
    return timestamps.filter((t) => t >= cutoff);
}

export type ForumRateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

type ForumRateScope = 'post' | 'comment' | 'report';

function resolveRateKey(scope: ForumRateScope, userId: string, opts?: { postId?: string }): string {
    return scope === 'report' && opts?.postId ? `${scope}:${userId}:${opts.postId}` : `${scope}:${userId}`;
}

type RateEvaluation =
    | { allowed: true; key: string; inWindow: number[]; now: number }
    | { allowed: false; retryAfterSec: number };

function evaluateForumRateLimit(
    scope: ForumRateScope,
    userId: string,
    opts?: { postId?: string },
): RateEvaluation {
    if (!userId.trim()) {
        return { allowed: false, retryAfterSec: 60 };
    }
    const now = Date.now();
    const key = resolveRateKey(scope, userId, opts);
    const bucket = readBucket(key);
    let windowMs = 60_000;
    let maxInWindow = 5;

    if (scope === 'post') {
        windowMs = 30_000;
        maxInWindow = 1;
    } else if (scope === 'comment') {
        windowMs = 60_000;
        maxInWindow = 30;
        const recent = prune(bucket.timestamps, 8_000);
        if (recent.length >= 1) {
            const retryAfterSec = Math.ceil((8_000 - (now - recent[recent.length - 1])) / 1000);
            return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
        }
    } else {
        windowMs = 24 * 60 * 60_000;
        maxInWindow = 1;
    }

    const inWindow = prune(bucket.timestamps, windowMs);
    if (inWindow.length >= maxInWindow) {
        const oldest = inWindow[0] ?? now;
        const retryAfterSec = Math.ceil((windowMs - (now - oldest)) / 1000);
        return { allowed: false, retryAfterSec: Math.max(1, retryAfterSec) };
    }

    return { allowed: true, key, inWindow, now };
}

/**
 * قراءة حد المعدّل دون استهلاك الحصة — لفحص الإبلاغ قبل طلب الخادم.
 */
export function peekForumRateLimit(
    scope: ForumRateScope,
    userId: string,
    opts?: { postId?: string },
): ForumRateLimitResult {
    const evaluated = evaluateForumRateLimit(scope, userId, opts);
    if (!evaluated.allowed) return evaluated;
    return { allowed: true };
}

/**
 * حد معدّل على الجهاز (طبقة UX) — لا يغني عن حدود السيرفر.
 * يستهلك حصة عند السماح.
 */
export function checkForumRateLimit(
    scope: ForumRateScope,
    userId: string,
    opts?: { postId?: string },
): ForumRateLimitResult {
    const evaluated = evaluateForumRateLimit(scope, userId, opts);
    if (!evaluated.allowed) return evaluated;
    writeBucket(evaluated.key, { timestamps: [...evaluated.inWindow, evaluated.now] });
    return { allowed: true };
}

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

/**
 * حد معدّل على الجهاز (طبقة UX) — لا يغني عن حدود السيرفر.
 */
export function checkForumRateLimit(
    scope: 'post' | 'comment' | 'report',
    userId: string,
    opts?: { postId?: string },
): ForumRateLimitResult {
    const now = Date.now();
    const key =
        scope === 'report' && opts?.postId
            ? `${scope}:${userId}:${opts.postId}`
            : `${scope}:${userId}`;
    const bucket = readBucket(key);
    let windowMs = 60_000;
    let maxInWindow = 5;

    if (scope === 'post') {
        return { allowed: true };
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

    writeBucket(key, { timestamps: [...inWindow, now] });
    return { allowed: true };
}

/** مدة حظر المنتدى من المقر — الواجهة تعرض دائماً / ٢٤ ساعة / ٧ أيام فقط. */

export const HQ_FORUM_BAN_DURATION_HOURS = [24, 168] as const;
export const HQ_FORUM_BAN_TIMED_MAX_MS = 8 * 24 * 60 * 60 * 1000;
export const HQ_FORUM_BAN_PAST_SKEW_MS = 60_000;
export const HQ_FORUM_BAN_REASON_MIN = 3;
export const HQ_FORUM_BAN_NAME_MAX = 80;
export const HQ_FORUM_BAN_REASON_MAX = 240;

export function isHqForumBanActive(expiresAt: string | undefined, nowMs: number = Date.now()): boolean {
    if (!expiresAt) return true;
    const until = Date.parse(expiresAt);
    if (!Number.isFinite(until)) return false;
    return until > nowMs;
}

export function parseHqForumBanExpiry(raw: unknown, nowMs: number = Date.now()): string | undefined | 'invalid' {
    if (raw === undefined || raw === null || raw === '') return undefined;
    if (typeof raw !== 'string') return 'invalid';
    const parsed = Date.parse(raw.trim());
    if (!Number.isFinite(parsed)) return 'invalid';
    if (parsed + HQ_FORUM_BAN_PAST_SKEW_MS < nowMs) return 'invalid';
    if (parsed - nowMs > HQ_FORUM_BAN_TIMED_MAX_MS) return 'invalid';
    return new Date(parsed).toISOString();
}

export function resolveHqForumBanExpiry(
    payload: { durationHours?: unknown; expiresAt?: unknown },
    nowMs: number = Date.now(),
): string | undefined | 'invalid' {
    if (payload.durationHours !== undefined && payload.durationHours !== null && payload.durationHours !== '') {
        const hours = Number(payload.durationHours);
        if (hours === 0) return undefined;
        if (hours === 24 || hours === 168) {
            return new Date(nowMs + hours * 3_600_000).toISOString();
        }
        return 'invalid';
    }
    return parseHqForumBanExpiry(payload.expiresAt, nowMs);
}

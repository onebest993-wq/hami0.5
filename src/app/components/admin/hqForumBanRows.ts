import { clampHqCount, stripHqControlChars } from '@/app/domain/admin/hqSafeText';

const ID_MAX = 64;
const NAME_MAX = 80;
const REASON_MAX = 240;
const TIME_MAX = 40;
const TAG_MAX = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HqForumStats = {
    totalPosts: number;
    totalComments: number;
    totalUpvotes: number;
    totalReports: number;
    pendingReports: number;
    totalDocuments: number;
    totalBannedUsers: number;
    topTags: { tag: string; count: number }[];
};

export type HqBannedUserRow = {
    userId: string;
    userName: string;
    reason: string;
    bannedAt: string;
    expiresAt?: string;
};

export type HqForumDirectoryUser = {
    id: string;
    fullName: string;
    email: string;
};

function asUuid(value: unknown): string {
    const id = stripHqControlChars(value, ID_MAX);
    return UUID_RE.test(id) ? id : '';
}

export function sanitizeHqForumStats(raw: unknown): HqForumStats | null {
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    const topTags: HqForumStats['topTags'] = [];
    if (Array.isArray(rec.topTags)) {
        for (const item of rec.topTags) {
            if (!item || typeof item !== 'object') continue;
            const tagRec = item as Record<string, unknown>;
            const tag = stripHqControlChars(tagRec.tag, TAG_MAX);
            if (!tag) continue;
            topTags.push({ tag, count: clampHqCount(tagRec.count, 1_000_000) });
            if (topTags.length >= 10) break;
        }
    }
    return {
        totalPosts: clampHqCount(rec.totalPosts),
        totalComments: clampHqCount(rec.totalComments),
        totalUpvotes: clampHqCount(rec.totalUpvotes),
        totalReports: clampHqCount(rec.totalReports),
        pendingReports: clampHqCount(rec.pendingReports),
        totalDocuments: clampHqCount(rec.totalDocuments),
        totalBannedUsers: clampHqCount(rec.totalBannedUsers),
        topTags,
    };
}

export function sanitizeHqBannedUserRow(raw: unknown): HqBannedUserRow | null {
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    const userId = asUuid(rec.userId);
    if (!userId) return null;
    const expiresRaw = stripHqControlChars(rec.expiresAt, TIME_MAX);
    return {
        userId,
        userName: stripHqControlChars(rec.userName, NAME_MAX) || userId,
        reason: stripHqControlChars(rec.reason, REASON_MAX),
        bannedAt: stripHqControlChars(rec.bannedAt, TIME_MAX),
        expiresAt: expiresRaw || undefined,
    };
}

export function sanitizeHqBannedUserRows(raw: unknown): HqBannedUserRow[] {
    if (!Array.isArray(raw)) return [];
    const out: HqBannedUserRow[] = [];
    for (const row of raw) {
        const mapped = sanitizeHqBannedUserRow(row);
        if (mapped) out.push(mapped);
    }
    return out;
}

export function sanitizeHqForumDirectoryUser(raw: unknown): HqForumDirectoryUser | null {
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    const id = asUuid(rec.id);
    if (!id) return null;
    return {
        id,
        fullName: stripHqControlChars(rec.fullName, NAME_MAX) || id,
        email: stripHqControlChars(rec.email, 120),
    };
}

export function sanitizeHqForumDirectoryUsers(raw: unknown): HqForumDirectoryUser[] {
    if (!Array.isArray(raw)) return [];
    const out: HqForumDirectoryUser[] = [];
    for (const row of raw) {
        const mapped = sanitizeHqForumDirectoryUser(row);
        if (mapped) out.push(mapped);
    }
    return out;
}

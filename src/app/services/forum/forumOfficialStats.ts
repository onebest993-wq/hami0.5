import { loadForumSupabaseAdmin } from './loadForumSupabaseAdmin';

export type ForumOfficialStats = {
    totalPosts: number;
    totalComments: number;
    totalUpvotes: number;
    totalReports: number;
    pendingReports: number;
    totalDocuments: number;
    totalBannedUsers: number;
    topTags: { tag: string; count: number }[];
};

type CountBuilder = {
    is: (column: string, value: null) => CountBuilder;
    eq: (column: string, value: string) => CountBuilder;
    not: (column: string, operator: string, value: null) => CountBuilder;
    gt: (column: string, value: string) => CountBuilder;
};

async function headCount(
    admin: { from: (table: string) => { select: (cols: string, opts: { count: 'exact'; head: boolean }) => CountBuilder } },
    table: string,
    filter?: (q: CountBuilder) => CountBuilder,
): Promise<number> {
    /** `*` — forum_bans بلا عمود id؛ العدّ HEAD لا يحتاج عموداً محدداً. */
    const base = admin.from(table).select('*', { count: 'exact', head: true });
    const query = filter ? filter(base) : base;
    const { count, error } = await (query as unknown as PromiseLike<{
        count: number | null;
        error: unknown;
    }>);
    if (error) throw new Error('forum stats count failed');
    return typeof count === 'number' ? count : 0;
}

/**
 * إحصاءات المنتدى من Postgres الحي — ليست مرآة CommunityDB على عملية BFF.
 * totalDocuments = منشورات عامة لها مرفق (`attachment`) — ليست خزنة المحامي المشفّرة.
 * totalBannedUsers = حظر ساري (دائم أو لم ينتهِ) — ليس أرشيف الصفوف المنتهية.
 */
export async function loadForumOfficialStats(): Promise<ForumOfficialStats | null> {
    const admin = await loadForumSupabaseAdmin();
    if (!admin) {
        return null;
    }

    const nowIso = new Date().toISOString();
    const [
        totalPosts,
        totalComments,
        totalReports,
        pendingReports,
        bannedPermanent,
        bannedTimedActive,
        totalDocuments,
        postRows,
        commentUpvotes,
    ] = await Promise.all([
        headCount(admin, 'forum_posts', (q) => q.is('group_id', null)),
        headCount(admin, 'forum_comments'),
        headCount(admin, 'forum_reports'),
        headCount(admin, 'forum_reports', (q) => q.eq('status', 'pending')),
        headCount(admin, 'forum_bans', (q) => q.is('expires_at', null)),
        headCount(admin, 'forum_bans', (q) => q.gt('expires_at', nowIso)),
        headCount(admin, 'forum_posts', (q) => q.is('group_id', null).not('attachment', 'is', null)),
        admin.from('forum_posts').select('tags, upvoter_ids').is('group_id', null).limit(2000),
        admin.from('forum_comment_upvotes').select('comment_id', { count: 'exact', head: true }),
    ]);

    const tagCount = new Map<string, number>();
    let postUpvotes = 0;
    if (!postRows.error && Array.isArray(postRows.data)) {
        for (const row of postRows.data as Array<{ tags?: unknown; upvoter_ids?: unknown }>) {
            const tags = Array.isArray(row.tags) ? row.tags : [];
            for (const tag of tags) {
                const label = String(tag ?? '')
                    .replace(/[\u0000-\u001F\u007F]/g, '')
                    .trim()
                    .slice(0, 40);
                if (!label) continue;
                tagCount.set(label, (tagCount.get(label) ?? 0) + 1);
            }
            if (Array.isArray(row.upvoter_ids)) postUpvotes += row.upvoter_ids.length;
        }
    }
    const commentVoteCount =
        commentUpvotes.error || typeof commentUpvotes.count !== 'number' ? 0 : commentUpvotes.count;
    const topTags = Array.from(tagCount.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
        totalPosts,
        totalComments,
        totalUpvotes: postUpvotes + commentVoteCount,
        totalReports,
        pendingReports,
        totalDocuments,
        totalBannedUsers: bannedPermanent + bannedTimedActive,
        topTags,
    };
}

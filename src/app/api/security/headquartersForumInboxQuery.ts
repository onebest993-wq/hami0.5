import type { SupabaseClient } from '@supabase/supabase-js';
import { deleteHeadquartersConsultation } from './headquartersConsultationsQuery.ts';
import {
    HQ_FORUM_BAN_NAME_MAX,
    HQ_FORUM_BAN_REASON_MAX,
    isHqForumBanActive,
} from './headquartersForumBanExpiry.ts';
import {
    clipHqForumInboxField,
    HQ_FORUM_INBOX_ID_MAX,
    HQ_FORUM_INBOX_REASON_MAX,
    HQ_FORUM_INBOX_SNIPPET_MAX,
    HQ_FORUM_INBOX_TIME_MAX,
    mapHqForumPostSnippet,
    uniqueHqForumReportNotices,
    type HqForumReportNotice,
} from './hqForumInboxMap.ts';
import { isPostgresUuidSubject } from './postgresUuidSubject.ts';

export const HEADQUARTERS_FORUM_INBOX_CAP = 80;

export type HeadquartersForumReportPost = {
    id: string;
    title: string;
    content: string;
};

/** قائمة الصندوق — بلا معرّف المبلِّغ (يُقرأ من DB عند القرار فقط). */
export type HeadquartersForumReport = {
    id: string;
    postId: string;
    reason: string;
    createdAt: string;
    post: HeadquartersForumReportPost | null;
};

export type HeadquartersBannedUser = {
    userId: string;
    userName: string;
    reason: string;
    bannedAt: string;
    expiresAt?: string;
};

type ReportRow = {
    id?: unknown;
    post_id?: unknown;
    reporter_id?: unknown;
    reason?: unknown;
    created_at?: unknown;
    status?: unknown;
};

type PostSnippetRow = {
    id?: unknown;
    content?: unknown;
};

export type HeadquartersCommentReport = {
    id: string;
    commentId: string;
    postId: string;
    reason: string;
    createdAt: string;
    snippet: string;
};

type CommentReportRow = {
    id?: unknown;
    comment_id?: unknown;
    reporter_id?: unknown;
    reason?: unknown;
    created_at?: unknown;
    status?: unknown;
};

type CommentSnippetRow = {
    id?: unknown;
    post_id?: unknown;
    content?: unknown;
};

type BanRow = {
    user_id?: unknown;
    user_name?: unknown;
    reason?: unknown;
    banned_at?: unknown;
    expires_at?: unknown;
};

/**
 * بلاغات/حظر المقر من Postgres مباشرة — بلا ForumRepository / CommunityDB.
 */
export async function listHeadquartersPendingReports(
    admin: SupabaseClient,
): Promise<HeadquartersForumReport[]> {
    const { data, error } = await admin
        .from('forum_reports')
        .select('id, post_id, reason, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(HEADQUARTERS_FORUM_INBOX_CAP);
    if (error) {
        throw new Error(error.message || 'Failed to list reports');
    }
    const rows = Array.isArray(data) ? (data as ReportRow[]) : [];
    const postIds = [
        ...new Set(
            rows
                .map((row) => clipHqForumInboxField(row.post_id, HQ_FORUM_INBOX_ID_MAX))
                .filter(Boolean),
        ),
    ];

    const snippets = new Map<string, HeadquartersForumReportPost>();
    if (postIds.length > 0) {
        const { data: posts, error: postError } = await admin
            .from('forum_posts')
            .select('id, content')
            .in('id', postIds);
        if (!postError && Array.isArray(posts)) {
            for (const raw of posts as PostSnippetRow[]) {
                const mapped = mapHqForumPostSnippet(raw);
                if (mapped) snippets.set(mapped.id, mapped);
            }
        }
    }

    const reports: HeadquartersForumReport[] = [];
    for (const row of rows) {
        const id = clipHqForumInboxField(row.id, HQ_FORUM_INBOX_ID_MAX);
        const postId = clipHqForumInboxField(row.post_id, HQ_FORUM_INBOX_ID_MAX);
        if (!id || !postId) continue;
        reports.push({
            id,
            postId,
            reason: clipHqForumInboxField(row.reason, HQ_FORUM_INBOX_REASON_MAX),
            createdAt: clipHqForumInboxField(row.created_at, HQ_FORUM_INBOX_TIME_MAX),
            post: snippets.get(postId) ?? null,
        });
    }
    return reports;
}

export async function listHeadquartersBannedUsers(
    admin: SupabaseClient,
): Promise<HeadquartersBannedUser[]> {
    const nowIso = new Date().toISOString();
    const { data, error } = await admin
        .from('forum_bans')
        .select('user_id, user_name, reason, banned_at, expires_at')
        .or(`expires_at.is.null,expires_at.gt."${nowIso}"`)
        .order('banned_at', { ascending: false })
        .limit(HEADQUARTERS_FORUM_INBOX_CAP);
    if (error) {
        throw new Error(error.message || 'Failed to list bans');
    }
    const rows = Array.isArray(data) ? (data as BanRow[]) : [];
    const banned: HeadquartersBannedUser[] = [];
    for (const row of rows) {
        const userId = clipHqForumInboxField(row.user_id, HQ_FORUM_INBOX_ID_MAX);
        if (!isPostgresUuidSubject(userId)) continue;
        const expiresAtRaw = clipHqForumInboxField(row.expires_at, HQ_FORUM_INBOX_TIME_MAX);
        const expiresAt = expiresAtRaw || undefined;
        if (!isHqForumBanActive(expiresAt)) continue;
        banned.push({
            userId,
            userName: clipHqForumInboxField(row.user_name, HQ_FORUM_BAN_NAME_MAX) || userId,
            reason: clipHqForumInboxField(row.reason, HQ_FORUM_BAN_REASON_MAX),
            bannedAt: clipHqForumInboxField(row.banned_at, HQ_FORUM_INBOX_TIME_MAX),
            expiresAt,
        });
    }
    return banned;
}

export async function dismissHeadquartersForumReport(
    admin: SupabaseClient,
    reportId: string,
    reviewerId: string,
): Promise<{ ok: true; reporterId: string; postId: string } | { ok: false; reason: 'missing' }> {
    const id = reportId.trim();
    const reviewer = reviewerId.trim();
    if (!id || !reviewer) return { ok: false, reason: 'missing' };

    const { data, error } = await admin
        .from('forum_reports')
        .select('id, reporter_id, post_id')
        .eq('id', id)
        .eq('status', 'pending')
        .maybeSingle();
    if (error) throw new Error(error.message || 'Failed to load report');
    if (!data) return { ok: false, reason: 'missing' };

    const { data: updated, error: updateError } = await admin
        .from('forum_reports')
        .update({
            status: 'dismissed',
            reviewed_by_id: reviewer,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
    if (updateError) throw new Error(updateError.message || 'Failed to dismiss report');
    if (!updated) return { ok: false, reason: 'missing' };

    const row = data as { reporter_id?: unknown; post_id?: unknown };
    return {
        ok: true,
        reporterId: clipHqForumInboxField(row.reporter_id, HQ_FORUM_INBOX_ID_MAX),
        postId: clipHqForumInboxField(row.post_id, HQ_FORUM_INBOX_ID_MAX),
    };
}

export async function deleteHeadquartersReportedPost(
    admin: SupabaseClient,
    postId: string,
): Promise<'missing' | { ok: true; authorId: string }> {
    return deleteHeadquartersConsultation(admin, postId);
}

export async function listHeadquartersPendingCommentReports(
    admin: SupabaseClient,
): Promise<HeadquartersCommentReport[]> {
    const { data, error } = await admin
        .from('forum_comment_reports')
        .select('id, comment_id, reason, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(HEADQUARTERS_FORUM_INBOX_CAP);
    if (error) {
        const detail = typeof error.message === 'string' ? error.message : '';
        if (/does not exist|schema cache|relation/i.test(detail)) return [];
        throw new Error(detail || 'Failed to list comment reports');
    }
    const rows = Array.isArray(data) ? (data as CommentReportRow[]) : [];
    const commentIds = [
        ...new Set(
            rows
                .map((row) => clipHqForumInboxField(row.comment_id, HQ_FORUM_INBOX_ID_MAX))
                .filter(Boolean),
        ),
    ];
    const snippets = new Map<string, { postId: string; snippet: string }>();
    if (commentIds.length > 0) {
        const { data: comments, error: commentError } = await admin
            .from('forum_comments')
            .select('id, post_id, content')
            .in('id', commentIds);
        if (!commentError && Array.isArray(comments)) {
            for (const raw of comments as CommentSnippetRow[]) {
                const id = clipHqForumInboxField(raw.id, HQ_FORUM_INBOX_ID_MAX);
                if (!id) continue;
                snippets.set(id, {
                    postId: clipHqForumInboxField(raw.post_id, HQ_FORUM_INBOX_ID_MAX),
                    snippet: clipHqForumInboxField(raw.content, HQ_FORUM_INBOX_SNIPPET_MAX),
                });
            }
        }
    }
    const reports: HeadquartersCommentReport[] = [];
    for (const row of rows) {
        const id = clipHqForumInboxField(row.id, HQ_FORUM_INBOX_ID_MAX);
        const commentId = clipHqForumInboxField(row.comment_id, HQ_FORUM_INBOX_ID_MAX);
        if (!id || !commentId) continue;
        const hit = snippets.get(commentId);
        reports.push({
            id,
            commentId,
            postId: hit?.postId ?? '',
            reason: clipHqForumInboxField(row.reason, HQ_FORUM_INBOX_REASON_MAX),
            createdAt: clipHqForumInboxField(row.created_at, HQ_FORUM_INBOX_TIME_MAX),
            snippet: hit?.snippet ?? '',
        });
    }
    return reports;
}

export async function dismissHeadquartersCommentReport(
    admin: SupabaseClient,
    reportId: string,
    reviewerId: string,
): Promise<{ ok: true; reporterId: string; commentId: string; postId: string } | { ok: false; reason: 'missing' }> {
    const id = reportId.trim();
    const reviewer = reviewerId.trim();
    if (!id || !reviewer) return { ok: false, reason: 'missing' };
    const { data, error } = await admin
        .from('forum_comment_reports')
        .select('id, reporter_id, comment_id')
        .eq('id', id)
        .eq('status', 'pending')
        .maybeSingle();
    if (error) throw new Error(error.message || 'Failed to load comment report');
    if (!data) return { ok: false, reason: 'missing' };
    const { data: updated, error: updateError } = await admin
        .from('forum_comment_reports')
        .update({
            status: 'dismissed',
            reviewed_by_id: reviewer,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
    if (updateError) throw new Error(updateError.message || 'Failed to dismiss comment report');
    if (!updated) return { ok: false, reason: 'missing' };
    const row = data as { reporter_id?: unknown; comment_id?: unknown };
    const commentId = clipHqForumInboxField(row.comment_id, HQ_FORUM_INBOX_ID_MAX);
    let postId = '';
    if (commentId) {
        const { data: comment } = await admin
            .from('forum_comments')
            .select('post_id')
            .eq('id', commentId)
            .maybeSingle();
        postId = clipHqForumInboxField((comment as { post_id?: unknown } | null)?.post_id, HQ_FORUM_INBOX_ID_MAX);
    }
    return {
        ok: true,
        reporterId: clipHqForumInboxField(row.reporter_id, HQ_FORUM_INBOX_ID_MAX),
        commentId,
        postId,
    };
}

export async function loadPendingForumReport(
    admin: SupabaseClient,
    reportId: string,
): Promise<{ id: string; postId: string } | null> {
    const id = clipHqForumInboxField(reportId, HQ_FORUM_INBOX_ID_MAX);
    if (!id) return null;
    const { data, error } = await admin
        .from('forum_reports')
        .select('id, post_id')
        .eq('id', id)
        .eq('status', 'pending')
        .maybeSingle();
    if (error) throw new Error(error.message || 'Failed to load report');
    if (!data) return null;
    const postId = clipHqForumInboxField((data as { post_id?: unknown }).post_id, HQ_FORUM_INBOX_ID_MAX);
    if (!postId) return null;
    return { id, postId };
}

export async function listPendingPostReportNotices(
    admin: SupabaseClient,
    postId: string,
): Promise<HqForumReportNotice[]> {
    const id = clipHqForumInboxField(postId, HQ_FORUM_INBOX_ID_MAX);
    if (!id) return [];
    const { data, error } = await admin
        .from('forum_reports')
        .select('reporter_id, post_id')
        .eq('post_id', id)
        .eq('status', 'pending');
    if (error) throw new Error(error.message || 'Failed to list report notices');
    const rows = Array.isArray(data) ? data : [];
    return uniqueHqForumReportNotices(
        rows.map((row) => ({
            reporterId: (row as { reporter_id?: unknown }).reporter_id,
            postId: (row as { post_id?: unknown }).post_id,
        })),
    );
}

export async function loadPendingCommentReport(
    admin: SupabaseClient,
    reportId: string,
): Promise<{ id: string; commentId: string } | null> {
    const id = clipHqForumInboxField(reportId, HQ_FORUM_INBOX_ID_MAX);
    if (!id) return null;
    const { data, error } = await admin
        .from('forum_comment_reports')
        .select('id, comment_id')
        .eq('id', id)
        .eq('status', 'pending')
        .maybeSingle();
    if (error) throw new Error(error.message || 'Failed to load comment report');
    if (!data) return null;
    const commentId = clipHqForumInboxField(
        (data as { comment_id?: unknown }).comment_id,
        HQ_FORUM_INBOX_ID_MAX,
    );
    if (!commentId) return null;
    return { id, commentId };
}

export async function listPendingCommentReportNotices(
    admin: SupabaseClient,
    commentId: string,
): Promise<HqForumReportNotice[]> {
    const id = clipHqForumInboxField(commentId, HQ_FORUM_INBOX_ID_MAX);
    if (!id) return [];
    const { data: comment, error: commentError } = await admin
        .from('forum_comments')
        .select('id, post_id')
        .eq('id', id)
        .maybeSingle();
    if (commentError) throw new Error(commentError.message || 'Failed to load comment');
    const postId = clipHqForumInboxField(
        (comment as { post_id?: unknown } | null)?.post_id,
        HQ_FORUM_INBOX_ID_MAX,
    );
    if (!postId) return [];
    const { data, error } = await admin
        .from('forum_comment_reports')
        .select('reporter_id')
        .eq('comment_id', id)
        .eq('status', 'pending');
    if (error) throw new Error(error.message || 'Failed to list comment report notices');
    const rows = Array.isArray(data) ? data : [];
    return uniqueHqForumReportNotices(
        rows.map((row) => ({
            reporterId: (row as { reporter_id?: unknown }).reporter_id,
            postId,
        })),
    );
}

export async function deleteHeadquartersReportedComment(
    admin: SupabaseClient,
    commentId: string,
): Promise<'missing' | { ok: true; authorId: string; postId: string }> {
    const id = clipHqForumInboxField(commentId, HQ_FORUM_INBOX_ID_MAX);
    if (!id) return 'missing';
    const { data, error } = await admin
        .from('forum_comments')
        .select('id, author_id, post_id')
        .eq('id', id)
        .maybeSingle();
    if (error) throw new Error(error.message || 'Failed to load comment');
    if (!data) return 'missing';
    const row = data as { author_id?: unknown; post_id?: unknown };
    const authorId = clipHqForumInboxField(row.author_id, HQ_FORUM_INBOX_ID_MAX);
    const postId = clipHqForumInboxField(row.post_id, HQ_FORUM_INBOX_ID_MAX);
    const { error: deleteError } = await admin.from('forum_comments').delete().eq('id', id);
    if (deleteError) throw new Error(deleteError.message || 'Failed to delete comment');
    return { ok: true, authorId, postId };
}

export async function upsertHeadquartersForumBan(
    admin: SupabaseClient,
    record: {
        userId: string;
        userName: string;
        reason: string;
        bannedBy: string;
        bannedAt: string;
        expiresAt?: string;
    },
): Promise<void> {
    const { error } = await admin.from('forum_bans').upsert({
        user_id: record.userId,
        user_name: clipHqForumInboxField(record.userName, HQ_FORUM_BAN_NAME_MAX),
        reason: clipHqForumInboxField(record.reason, HQ_FORUM_BAN_REASON_MAX),
        banned_by: record.bannedBy,
        banned_at: record.bannedAt,
        expires_at: record.expiresAt ?? null,
    });
    if (error) throw new Error(error.message || 'Failed to ban user');
}

export async function deleteHeadquartersForumBan(
    admin: SupabaseClient,
    userId: string,
): Promise<'ok' | 'missing'> {
    const id = userId.trim();
    if (!id) return 'missing';
    const { data, error } = await admin.from('forum_bans').delete().eq('user_id', id).select('user_id');
    if (error) throw new Error(error.message || 'Failed to unban user');
    if (!Array.isArray(data) || data.length === 0) return 'missing';
    return 'ok';
}

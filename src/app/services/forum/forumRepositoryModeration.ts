import type { BanRecord, CommunityReport } from '@/app/services/forum/forumTypes';
import {
    BanDB,
    dismissCommunityReport,
    ForumBookmarkDB,
    getCommunityReports,
    reportCommunityPost,
} from '@/app/services/forum/forumCommunityRuntime';
import { getForumSupabaseAdmin } from './supabaseAdmin';
import { createForumRepositoryId, loadCommentUpvotes } from './forumRepositoryHydration';

export const forumRepositoryModeration = {
    async reportPost(
        postId: string,
        reason: string,
        reporterId: string,
    ): Promise<{ ok: boolean; duplicate?: boolean }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return reportCommunityPost(postId, reason, reporterId);
        }

        const { data: existing } = await admin
            .from('forum_reports')
            .select('id')
            .eq('post_id', postId)
            .eq('reporter_id', reporterId)
            .eq('status', 'pending')
            .maybeSingle();
        if (existing) return { ok: false, duplicate: true };

        const { error } = await admin.from('forum_reports').insert({
            id: createForumRepositoryId(),
            post_id: postId,
            reporter_id: reporterId,
            reason,
            status: 'pending',
        });
        if (error) {
            if (error.code === '23505') return { ok: false, duplicate: true };
            throw new Error(error.message);
        }
        return { ok: true };
    },

    async listReports(): Promise<CommunityReport[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return getCommunityReports();
        }
        const { data, error } = await admin
            .from('forum_reports')
            .select('*')
            .order('created_at', { ascending: false });
        if (error || !data) return [];
        return (data as Array<Record<string, unknown>>).map((r) => ({
            id: String(r.id),
            postId: String(r.post_id),
            reporterId: String(r.reporter_id),
            reason: String(r.reason),
            status: r.status as CommunityReport['status'],
            createdAt: String(r.created_at),
            reviewedById: typeof r.reviewed_by_id === 'string' ? r.reviewed_by_id : undefined,
            reviewedAt: typeof r.reviewed_at === 'string' ? r.reviewed_at : undefined,
        }));
    },

    async dismissReport(
        reportId: string,
        reviewerId: string,
        notifyOutcome: 'dismissed' | 'removed' | false = 'dismissed',
    ): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            await dismissCommunityReport(reportId, reviewerId);
            return;
        }
        const { data: reportRow } = await admin
            .from('forum_reports')
            .select('reporter_id, post_id')
            .eq('id', reportId)
            .maybeSingle();
        await admin
            .from('forum_reports')
            .update({
                status: 'dismissed',
                reviewed_by_id: reviewerId,
                reviewed_at: new Date().toISOString(),
            })
            .eq('id', reportId);
        if (notifyOutcome && reportRow) {
            const row = reportRow as { reporter_id: string; post_id: string };
            void import('./forumNotificationDispatch').then(({ dispatchReportOutcomeNotification }) =>
                dispatchReportOutcomeNotification({
                    reporterId: row.reporter_id,
                    postId: row.post_id,
                    outcome: notifyOutcome,
                }),
            );
        }
    },

    async isBanned(userId: string): Promise<BanRecord | null> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return BanDB.isBanned(userId);
        }
        const { data } = await admin.from('forum_bans').select('*').eq('user_id', userId).maybeSingle();
        if (!data) return null;
        const row = data as Record<string, unknown>;
        if (row.expires_at && Date.parse(String(row.expires_at)) < Date.now()) {
            await admin.from('forum_bans').delete().eq('user_id', userId);
            return null;
        }
        return {
            userId: String(row.user_id),
            userName: String(row.user_name ?? ''),
            reason: String(row.reason ?? ''),
            bannedBy: String(row.banned_by ?? ''),
            bannedAt: String(row.banned_at),
            expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
        };
    },

    async banUser(record: BanRecord): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            await BanDB.banUser(record);
            return;
        }
        await admin.from('forum_bans').upsert({
            user_id: record.userId,
            user_name: record.userName,
            reason: record.reason,
            banned_by: record.bannedBy,
            banned_at: record.bannedAt,
            expires_at: record.expiresAt ?? null,
        });
    },

    async unbanUser(userId: string): Promise<void> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            await BanDB.unbanUser(userId);
            return;
        }
        await admin.from('forum_bans').delete().eq('user_id', userId);
    },

    async listBannedUsers(): Promise<BanRecord[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return BanDB.listBannedUsers();
        }
        const { data } = await admin.from('forum_bans').select('*');
        if (!data) return [];
        return (data as Array<Record<string, unknown>>).map((row) => ({
            userId: String(row.user_id),
            userName: String(row.user_name ?? ''),
            reason: String(row.reason ?? ''),
            bannedBy: String(row.banned_by ?? ''),
            bannedAt: String(row.banned_at),
            expiresAt: typeof row.expires_at === 'string' ? row.expires_at : undefined,
        }));
    },

    async toggleBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            const bookmarked = await ForumBookmarkDB.toggle(userId, postId);
            return { bookmarked };
        }
        const { data: existing } = await admin
            .from('forum_bookmarks')
            .select('post_id')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .maybeSingle();
        if (existing) {
            await admin.from('forum_bookmarks').delete().eq('user_id', userId).eq('post_id', postId);
            return { bookmarked: false };
        }
        const { error } = await admin
            .from('forum_bookmarks')
            .insert({ user_id: userId, post_id: postId });
        if (error) throw new Error(error.message);
        return { bookmarked: true };
    },

    async listBookmarkedPostIds(userId: string): Promise<string[]> {
        const admin = getForumSupabaseAdmin();
        if (!admin) {
            return ForumBookmarkDB.listPostIds(userId);
        }
        const { data } = await admin
            .from('forum_bookmarks')
            .select('post_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (!data) return [];
        return (data as Array<{ post_id: string }>).map((r) => r.post_id);
    },

    async toggleCommentUpvote(
        commentId: string,
        userId: string,
    ): Promise<{ upvoted: boolean; upvoterIds: string[] }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) return { upvoted: false, upvoterIds: [] };
        const { data: comment } = await admin
            .from('forum_comments')
            .select('author_id')
            .eq('id', commentId)
            .maybeSingle();
        if (!comment) throw new Error('التعليق غير موجود');
        if ((comment as { author_id: string }).author_id === userId) {
            throw new Error('لا يمكنك التصويت على تعليقك');
        }
        const { data: existing } = await admin
            .from('forum_comment_upvotes')
            .select('comment_id')
            .eq('user_id', userId)
            .eq('comment_id', commentId)
            .maybeSingle();
        if (existing) {
            await admin
                .from('forum_comment_upvotes')
                .delete()
                .eq('user_id', userId)
                .eq('comment_id', commentId);
        } else {
            const { error } = await admin
                .from('forum_comment_upvotes')
                .insert({ user_id: userId, comment_id: commentId });
            if (error) throw new Error(error.message);
        }
        const map = await loadCommentUpvotes([commentId]);
        const upvoterIds = map.get(commentId) ?? [];
        return { upvoted: upvoterIds.includes(userId), upvoterIds };
    },

    async reportComment(
        commentId: string,
        reason: string,
        reporterId: string,
    ): Promise<{ ok: boolean; duplicate?: boolean }> {
        const admin = getForumSupabaseAdmin();
        if (!admin) return { ok: false };

        const { data: existing } = await admin
            .from('forum_comment_reports')
            .select('id')
            .eq('comment_id', commentId)
            .eq('reporter_id', reporterId)
            .eq('status', 'pending')
            .maybeSingle();
        if (existing) return { ok: false, duplicate: true };

        const { error } = await admin.from('forum_comment_reports').insert({
            id: createForumRepositoryId(),
            comment_id: commentId,
            reporter_id: reporterId,
            reason,
            status: 'pending',
        });
        if (error) {
            if (error.code === '23505') return { ok: false, duplicate: true };
            throw new Error(error.message);
        }
        return { ok: true };
    },
};

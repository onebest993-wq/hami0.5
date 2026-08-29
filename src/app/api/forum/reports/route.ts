import { isJsonObjectRecord, sanitizePayload } from '../../security/sanitizer.ts';
import { getSupabaseAdminClient } from '../../security/supabaseAdminClient.ts';
import { isPostgresUuidSubject } from '../../security/postgresUuidSubject.ts';
import {
    HEADQUARTERS_FORUM_INBOX_CAP,
    deleteHeadquartersReportedComment,
    deleteHeadquartersReportedPost,
    dismissHeadquartersCommentReport,
    dismissHeadquartersForumReport,
    listHeadquartersPendingCommentReports,
    listHeadquartersPendingReports,
    listPendingCommentReportNotices,
    listPendingPostReportNotices,
    loadPendingCommentReport,
    loadPendingForumReport,
} from '../../security/headquartersForumInboxQuery.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { recordHeadquartersAudit } from '../../security/headquartersAudit.ts';
import { jsonResponse } from '../_auth.ts';
import { requireTrustedHeadquartersAdmin } from '../../security/requireTrustedHeadquartersAdmin.ts';
import type { HqForumReportNotice } from '../../security/hqForumInboxMap.ts';
import { notifyHeadquartersModeration } from '../../security/headquartersAccountNotify.ts';

function asUuid(value: unknown): string | null {
    const id = String(value ?? '').trim();
    return isPostgresUuidSubject(id) ? id : null;
}

function notifyReportOutcome(params: {
    reporterId: string;
    postId: string;
    outcome: 'dismissed' | 'removed';
}): void {
    if (!params.reporterId || !params.postId) return;
    void import('../../../services/forum/forumNotificationDispatch.ts').then(
        ({ dispatchReportOutcomeNotification }) =>
            dispatchReportOutcomeNotification({
                reporterId: params.reporterId,
                postId: params.postId,
                outcome: params.outcome,
            }),
    );
}

function notifyReportNotices(notices: HqForumReportNotice[], outcome: 'dismissed' | 'removed'): void {
    for (const notice of notices) {
        notifyReportOutcome({ ...notice, outcome });
    }
}

export async function GET(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return jsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        const [reports, commentReports] = await Promise.all([
            listHeadquartersPendingReports(admin),
            listHeadquartersPendingCommentReports(admin),
        ]);
        const capped =
            reports.length >= HEADQUARTERS_FORUM_INBOX_CAP ||
            commentReports.length >= HEADQUARTERS_FORUM_INBOX_CAP;
        return jsonResponse(200, { ok: true, reports, commentReports, capped });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}

export async function POST(request: Request): Promise<Response> {
    try {
        const gate = await requireTrustedHeadquartersAdmin(request);
        if (!gate.ok) return gate.response;
        const requesterId = gate.userId;

        const allowed = await consumeRateLimitSlot(`admin-hq-forum-reports:${requesterId}`, {
            maxRequests: 20,
            windowMs: 15 * 60_000,
        });
        if (!allowed) {
            return jsonResponse(429, { ok: false, error: 'تجاوزت حد عمليات المقر — حاول لاحقاً' });
        }

        let payload: unknown = null;
        try {
            payload = sanitizePayload(await request.json());
        } catch {
            payload = null;
        }

        if (!isJsonObjectRecord(payload) || typeof payload.action !== 'string' || !payload.action.trim()) {
            return jsonResponse(400, { ok: false, error: 'action مطلوب' });
        }

        const action = payload.action.trim();
        if (
            action !== 'dismiss' &&
            action !== 'delete_post' &&
            action !== 'dismiss_comment' &&
            action !== 'delete_comment'
        ) {
            return jsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
        }

        const admin = getSupabaseAdminClient();
        if (!admin) {
            return jsonResponse(503, { ok: false, error: 'Database client not configured' });
        }

        if (action === 'dismiss') {
            const reportId = asUuid(payload.reportId);
            if (!reportId) {
                return jsonResponse(400, { ok: false, error: 'reportId مطلوب' });
            }
            const dismissed = await dismissHeadquartersForumReport(admin, reportId, requesterId);
            if (!dismissed.ok) {
                return jsonResponse(404, { ok: false, error: 'البلاغ غير موجود' });
            }
            notifyReportOutcome({
                reporterId: dismissed.reporterId,
                postId: dismissed.postId,
                outcome: 'dismissed',
            });
            const auditRecorded = await recordHeadquartersAudit({
                actorId: requesterId,
                action: 'forum.report_dismiss',
                targetId: reportId,
            });
            return jsonResponse(200, { ok: true, action: 'report_dismissed', reportId, auditRecorded });
        }

        if (action === 'delete_post') {
            const postId = asUuid(payload.postId);
            const reportId = asUuid(payload.reportId);
            if (!postId || !reportId) {
                return jsonResponse(400, { ok: false, error: 'postId وreportId مطلوبان' });
            }
            const pending = await loadPendingForumReport(admin, reportId);
            if (!pending) {
                return jsonResponse(404, { ok: false, error: 'البلاغ غير موجود' });
            }
            if (pending.postId !== postId) {
                return jsonResponse(400, { ok: false, error: 'البلاغ لا يطابق المنشور' });
            }
            const notices = await listPendingPostReportNotices(admin, postId);
            const deleted = await deleteHeadquartersReportedPost(admin, postId);
            if (deleted === 'missing') {
                return jsonResponse(404, { ok: false, error: 'المنشور غير موجود' });
            }
            if (deleted.authorId) {
                void notifyHeadquartersModeration({
                    userId: deleted.authorId,
                    kind: 'post_removed',
                    entityId: postId,
                });
            }
            notifyReportNotices(notices, 'removed');
            const auditRecorded = await recordHeadquartersAudit({
                actorId: requesterId,
                action: 'forum.report_delete_post',
                targetId: postId,
            });
            return jsonResponse(200, { ok: true, action: 'post_deleted_via_report', postId, auditRecorded });
        }

        if (action === 'dismiss_comment') {
            const reportId = asUuid(payload.reportId);
            if (!reportId) {
                return jsonResponse(400, { ok: false, error: 'reportId مطلوب' });
            }
            const dismissed = await dismissHeadquartersCommentReport(admin, reportId, requesterId);
            if (!dismissed.ok) {
                return jsonResponse(404, { ok: false, error: 'البلاغ غير موجود' });
            }
            notifyReportOutcome({
                reporterId: dismissed.reporterId,
                postId: dismissed.postId,
                outcome: 'dismissed',
            });
            const auditRecorded = await recordHeadquartersAudit({
                actorId: requesterId,
                action: 'forum.comment_report_dismiss',
                targetId: reportId,
            });
            return jsonResponse(200, { ok: true, action: 'comment_report_dismissed', reportId, auditRecorded });
        }

        if (action === 'delete_comment') {
            const commentId = asUuid(payload.commentId);
            const reportId = asUuid(payload.reportId);
            if (!commentId || !reportId) {
                return jsonResponse(400, { ok: false, error: 'commentId وreportId مطلوبان' });
            }
            const pending = await loadPendingCommentReport(admin, reportId);
            if (!pending) {
                return jsonResponse(404, { ok: false, error: 'البلاغ غير موجود' });
            }
            if (pending.commentId !== commentId) {
                return jsonResponse(400, { ok: false, error: 'البلاغ لا يطابق التعليق' });
            }
            const notices = await listPendingCommentReportNotices(admin, commentId);
            const deleted = await deleteHeadquartersReportedComment(admin, commentId);
            if (deleted === 'missing') {
                return jsonResponse(404, { ok: false, error: 'التعليق غير موجود' });
            }
            if (deleted.authorId) {
                void notifyHeadquartersModeration({
                    userId: deleted.authorId,
                    kind: 'comment_removed',
                    entityId: commentId,
                });
            }
            notifyReportNotices(notices, 'removed');
            const auditRecorded = await recordHeadquartersAudit({
                actorId: requesterId,
                action: 'forum.comment_report_delete',
                targetId: commentId,
            });
            return jsonResponse(200, { ok: true, action: 'comment_deleted_via_report', commentId, auditRecorded });
        }

        return jsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
    } catch {
        return jsonResponse(500, { ok: false, error: 'Internal server error' });
    }
}

import { stripHqControlChars } from '@/app/domain/admin/hqSafeText';

const ID_MAX = 64;
const REASON_MAX = 240;
const TITLE_MAX = 80;
const SNIPPET_MAX = 500;
const TIME_MAX = 40;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type HqPostReportRow = {
    id: string;
    postId: string;
    reason: string;
    createdAt: string;
    post: { title: string; content: string } | null;
};

export type HqCommentReportRow = {
    id: string;
    commentId: string;
    postId: string;
    reason: string;
    createdAt: string;
    snippet: string;
};

function asId(value: unknown): string {
    const id = stripHqControlChars(value, ID_MAX);
    return UUID_RE.test(id) ? id : '';
}

export function sanitizeHqPostReportRow(raw: unknown): HqPostReportRow | null {
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    const id = asId(rec.id);
    const postId = asId(rec.postId);
    if (!id || !postId) return null;
    const postRaw = rec.post && typeof rec.post === 'object' ? (rec.post as Record<string, unknown>) : null;
    const content = stripHqControlChars(postRaw?.content, SNIPPET_MAX);
    const title = stripHqControlChars(postRaw?.title, TITLE_MAX) || content.slice(0, TITLE_MAX);
    return {
        id,
        postId,
        reason: stripHqControlChars(rec.reason, REASON_MAX),
        createdAt: stripHqControlChars(rec.createdAt, TIME_MAX),
        post: postRaw ? { title, content } : null,
    };
}

export function sanitizeHqCommentReportRow(raw: unknown): HqCommentReportRow | null {
    if (!raw || typeof raw !== 'object') return null;
    const rec = raw as Record<string, unknown>;
    const id = asId(rec.id);
    const commentId = asId(rec.commentId);
    if (!id || !commentId) return null;
    return {
        id,
        commentId,
        postId: asId(rec.postId),
        reason: stripHqControlChars(rec.reason, REASON_MAX),
        createdAt: stripHqControlChars(rec.createdAt, TIME_MAX),
        snippet: stripHqControlChars(rec.snippet, SNIPPET_MAX),
    };
}

export function sanitizeHqPostReportRows(raw: unknown): HqPostReportRow[] {
    if (!Array.isArray(raw)) return [];
    const out: HqPostReportRow[] = [];
    for (const row of raw) {
        const mapped = sanitizeHqPostReportRow(row);
        if (mapped) out.push(mapped);
    }
    return out;
}

export function sanitizeHqCommentReportRows(raw: unknown): HqCommentReportRow[] {
    if (!Array.isArray(raw)) return [];
    const out: HqCommentReportRow[] = [];
    for (const row of raw) {
        const mapped = sanitizeHqCommentReportRow(row);
        if (mapped) out.push(mapped);
    }
    return out;
}

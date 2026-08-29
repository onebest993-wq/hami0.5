/** تطهير حقول صندوق بلاغات المقر — بلا صور أو HTML. */

export const HQ_FORUM_INBOX_ID_MAX = 64;
export const HQ_FORUM_INBOX_REASON_MAX = 240;
export const HQ_FORUM_INBOX_TITLE_MAX = 80;
export const HQ_FORUM_INBOX_SNIPPET_MAX = 500;
export const HQ_FORUM_INBOX_TIME_MAX = 40;

export type HqForumReportNotice = {
    reporterId: string;
    postId: string;
};

export function clipHqForumInboxField(value: unknown, max: number): string {
    return String(value ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .trim()
        .slice(0, Math.max(0, max));
}

export function deriveHqForumPostTitle(content: string): string {
    const first = content.split(/[\r\n]/)[0] ?? '';
    return clipHqForumInboxField(first.replace(/\s+/g, ' '), HQ_FORUM_INBOX_TITLE_MAX);
}

export function mapHqForumPostSnippet(raw: {
    id?: unknown;
    content?: unknown;
}): { id: string; title: string; content: string } | null {
    const id = clipHqForumInboxField(raw.id, HQ_FORUM_INBOX_ID_MAX);
    if (!id) return null;
    const rawContent = String(raw.content ?? '');
    const content = clipHqForumInboxField(rawContent, HQ_FORUM_INBOX_SNIPPET_MAX);
    return {
        id,
        title: deriveHqForumPostTitle(rawContent),
        content,
    };
}

export function uniqueHqForumReportNotices(
    rows: Array<{ reporterId?: unknown; postId?: unknown }>,
): HqForumReportNotice[] {
    const seen = new Set<string>();
    const out: HqForumReportNotice[] = [];
    for (const row of rows) {
        const reporterId = clipHqForumInboxField(row.reporterId, HQ_FORUM_INBOX_ID_MAX);
        const postId = clipHqForumInboxField(row.postId, HQ_FORUM_INBOX_ID_MAX);
        if (!reporterId || !postId) continue;
        const key = `${reporterId}:${postId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ reporterId, postId });
    }
    return out;
}

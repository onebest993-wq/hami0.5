import { describe, expect, it } from 'vitest';
import { sanitizeHqCommentReportRow, sanitizeHqPostReportRow } from '../hqReportRows';

const POST = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee02';
const REPORT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee01';
const COMMENT = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeee03';

describe('hqReportRows', () => {
    it('يقص النصوص ويرفض معرّفاً غير UUID', () => {
        expect(sanitizeHqPostReportRow({ id: 'r1', postId: POST, reason: 'x' })).toBeNull();
        const row = sanitizeHqPostReportRow({
            id: REPORT,
            postId: POST,
            reporterId: 'should-drop',
            reason: `إساءة\u0000${'y'.repeat(300)}`,
            createdAt: '2026-08-01T00:00:00.000Z',
            post: { title: 'عنوان', content: 'نص' },
        });
        expect(row?.id).toBe(REPORT);
        expect(row?.reason.includes('\u0000')).toBe(false);
        expect(row?.reason.length).toBeLessThanOrEqual(240);
        expect(row).not.toHaveProperty('reporterId');
        expect(row?.post?.title).toBe('عنوان');
    });

    it('يطهّر بلاغ التعليق', () => {
        const row = sanitizeHqCommentReportRow({
            id: REPORT,
            commentId: COMMENT,
            postId: POST,
            reason: 'سبام',
            snippet: '<script>x</script>',
            reporterId: 'nope',
        });
        expect(row?.commentId).toBe(COMMENT);
        expect(row?.snippet).toContain('script');
        expect(row).not.toHaveProperty('reporterId');
    });
});

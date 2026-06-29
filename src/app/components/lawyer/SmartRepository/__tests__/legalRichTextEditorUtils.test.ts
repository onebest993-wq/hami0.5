import { describe, expect, it } from 'vitest';
import { sanitizeRichNoteHtml, extractQuickTaskLines } from '@/app/components/lawyer/SmartRepository/legalRichTextEditorUtils';

describe('sanitizeRichNoteHtml', () => {
    it('يزيل script وonerror', () => {
        const dirty = '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1) />';
        const clean = sanitizeRichNoteHtml(dirty);
        expect(clean).not.toContain('<script');
        expect(clean).not.toContain('onerror');
        expect(clean).toContain('ok');
    });

    it('يحافظ على التنسيق المسموح', () => {
        const html = '<p><strong data-legal-hl="1">نص</strong></p>';
        expect(sanitizeRichNoteHtml(html)).toContain('<strong');
    });

    it('extractQuickTaskLines يقرأ مهام data-quick-task فقط', () => {
        const html =
            '<p><span data-quick-task="1">☐ مهمة أ</span></p><p>☐ ليست مهمة</p>';
        expect(extractQuickTaskLines(html)).toEqual(['مهمة أ']);
    });
});

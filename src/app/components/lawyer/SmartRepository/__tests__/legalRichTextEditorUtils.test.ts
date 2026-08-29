import { describe, expect, it } from 'vitest';
import {
    clipboardPayloadToEditorHtml,
    sanitizeRichNoteHtml,
    extractQuickTaskLines,
} from '@/app/components/lawyer/SmartRepository/legalRichTextEditorUtils';

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

    it('يمنع svg وiframe وmath حتى مع محتوى داخلي', () => {
        const dirty = '<p>ok</p><svg onload=alert(1)></svg><iframe src="javascript:alert(1)"></iframe><math></math>';
        const clean = sanitizeRichNoteHtml(dirty);
        expect(clean).not.toMatch(/<svg/i);
        expect(clean).not.toMatch(/<iframe/i);
        expect(clean).not.toMatch(/<math/i);
        expect(clean).toContain('ok');
    });

    it('extractQuickTaskLines يقرأ مهام data-quick-task فقط', () => {
        const html =
            '<p><span data-quick-task="1">☐ مهمة أ</span></p><p>☐ ليست مهمة</p>';
        expect(extractQuickTaskLines(html)).toEqual(['مهمة أ']);
    });
});

describe('clipboardPayloadToEditorHtml', () => {
    it('يفضّل HTML على النص', () => {
        expect(clipboardPayloadToEditorHtml('<b>ذهبي</b>', 'نص')).toBe('<b>ذهبي</b>');
    });

    it('يهرّب النص العادي ويحوّل الأسطر إلى br', () => {
        expect(clipboardPayloadToEditorHtml('', 'أ < ب\nج')).toBe('أ &lt; ب<br>ج');
        expect(clipboardPayloadToEditorHtml('', 'a & b')).toBe('a &amp; b');
    });

    it('التنظيف بعد التحويل يمنع script حتى لو جاء من HTML الحافظة', () => {
        const raw = clipboardPayloadToEditorHtml('<p>ok</p><script>alert(1)</script>', '');
        const clean = sanitizeRichNoteHtml(raw);
        expect(clean).toContain('ok');
        expect(clean).not.toContain('<script');
    });
});

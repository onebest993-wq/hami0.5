import DOMPurify from 'dompurify';

const EDITOR_PURIFY = {
    ALLOWED_TAGS: [
        'b',
        'strong',
        'i',
        'em',
        'u',
        'span',
        'font',
        'br',
        'p',
        'div',
        'mark',
    ],
    ALLOWED_ATTR: [
        'style',
        'color',
        'size',
        'class',
        'data-quick-task',
        'data-law-article',
        'data-law-tip',
        'data-law-id',
        'data-dossier-note-stamp',
        'data-fmt-reset',
        'data-legal-hl',
    ],
};

export function sanitizeRichNoteHtml(html: string): string {
    return DOMPurify.sanitize(html, EDITOR_PURIFY);
}

/** يُدرج span neutral بعد إلغاء لون النص — يبقي المؤشر على سطر جديد نظيف */
export function insertFormatResetSpan(editor: HTMLElement, defaultColor: string): void {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(
        'insertHTML',
        false,
        `<span data-fmt-reset="1" style="color:${defaultColor};background:transparent;background-color:transparent;">&#8203;</span>`,
    );
    const sel = window.getSelection();
    const reset = editor.querySelector('[data-fmt-reset="1"]');
    if (sel && reset) {
        const zwsp = reset.firstChild;
        if (zwsp) {
            if (zwsp.nodeType === Node.TEXT_NODE && (zwsp as Text).length === 0) {
                (zwsp as Text).data = '\u200b';
            }
            const range = document.createRange();
            const offset =
                zwsp.nodeType === Node.TEXT_NODE ? Math.min(1, (zwsp as Text).length) : 0;
            range.setStart(zwsp, offset);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
        }
        reset.removeAttribute('data-fmt-reset');
    }
}

export function extractQuickTaskLines(html: string): string[] {
    if (typeof document === 'undefined') return [];
    const root = document.createElement('div');
    root.innerHTML = sanitizeRichNoteHtml(html);
    const lines: string[] = [];
    root.querySelectorAll('[data-quick-task="1"]').forEach((node) => {
        const text = (node.textContent ?? '').replace(/^☐\s*/, '').trim();
        if (text) lines.push(text);
    });
    return lines;
}

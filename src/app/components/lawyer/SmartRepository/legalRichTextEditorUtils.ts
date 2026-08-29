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
    FORBID_TAGS: [
        'svg',
        'math',
        'iframe',
        'object',
        'embed',
        'form',
        'link',
        'meta',
        'base',
        'style',
        'script',
        'video',
        'audio',
        'source',
        'canvas',
        'template',
    ],
    FORBID_ATTR: ['srcdoc', 'srcset', 'xlink:href'],
};

/** خصائص CSS المسموحة فقط في محرر الملاحظات */
const ALLOWED_STYLE_PROPS = new Set(['color', 'background', 'background-color', 'font-size']);

const SAFE_COLOR =
    /^(transparent|inherit|currentcolor|#[0-9a-f]{3,8}|rgba?\(\s*[\d.%\s,/]+\s*\)|[a-z]{3,20})$/i;
const SAFE_FONT_SIZE = /^\d+(\.\d+)?(px|rem|em|%)$/i;

let purifyHooksInstalled = false;

function sanitizeStyleDeclaration(raw: string): string {
    const kept: string[] = [];
    for (const part of raw.split(';')) {
        const idx = part.indexOf(':');
        if (idx <= 0) continue;
        const prop = part.slice(0, idx).trim().toLowerCase();
        const value = part.slice(idx + 1).trim();
        if (!ALLOWED_STYLE_PROPS.has(prop) || !value) continue;
        if (/expression|url\s*\(|behavior|-moz-binding|javascript:|@import/i.test(value)) {
            continue;
        }
        if (prop === 'font-size') {
            if (!SAFE_FONT_SIZE.test(value)) continue;
        } else if (!SAFE_COLOR.test(value)) {
            continue;
        }
        kept.push(`${prop}: ${value}`);
    }
    return kept.join('; ');
}

function installEditorPurifyHooks(): void {
    if (purifyHooksInstalled || typeof window === 'undefined') return;
    purifyHooksInstalled = true;
    DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
        if (data.attrName !== 'style') return;
        const cleaned = sanitizeStyleDeclaration(String(data.attrValue ?? ''));
        if (!cleaned) {
            data.keepAttr = false;
            return;
        }
        data.attrValue = cleaned;
    });
}

export function sanitizeRichNoteHtml(html: string): string {
    installEditorPurifyHooks();
    return DOMPurify.sanitize(html, EDITOR_PURIFY);
}

/** يحوّل حافظة المتصفح إلى HTML خام قبل التنظيف — HTML يتقدّم، والنص يُهرَّب */
export function clipboardPayloadToEditorHtml(html: string, text: string): string {
    if (html.trim()) return html;
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\r\n/g, '\n')
        .replace(/\n/g, '<br>');
}

/** نص عادي للبطاقات — يفكّ &nbsp; والوسوم دون ترك كيانات ظاهرة */
export function plainTextFromPossiblyHtml(raw: string): string {
    const input = (raw || '').trim();
    if (!input) return '';
    if (typeof document === 'undefined') {
        return input
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&#160;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
    }
    const el = document.createElement('div');
    el.innerHTML = sanitizeRichNoteHtml(input);
    return (el.textContent || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * يطبّق لون النص على التحديد دون استبدال محتواه.
 * `insertHTML` / `insertFormatResetSpan` يحذفان النص المحدّد — لا تُستخدما مع selection غير فارغ.
 */
export function applyForeColorToSelection(color: string): boolean {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return false;

    const span = document.createElement('span');
    span.style.color = color;
    try {
        span.appendChild(range.extractContents());
        range.insertNode(span);
    } catch {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('foreColor', false, color);
        return true;
    }

    sel.removeAllRanges();
    const next = document.createRange();
    next.selectNodeContents(span);
    next.collapse(false);
    sel.addRange(next);
    return true;
}

/** يُدرج span neutral عند المؤشر فقط (بدون تحديد) — لا يستبدل نصاً محدّداً */
export function insertFormatResetSpan(editor: HTMLElement, defaultColor: string): void {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
        applyForeColorToSelection(defaultColor);
        return;
    }

    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(
        'insertHTML',
        false,
        `<span data-fmt-reset="1" style="color:${defaultColor};background:transparent;background-color:transparent;">&#8203;</span>`,
    );
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
    const safeHtml = sanitizeRichNoteHtml(html);
    const parsed = new DOMParser().parseFromString(`<body>${safeHtml}</body>`, 'text/html');
    const root = parsed.body;
    const lines: string[] = [];
    root.querySelectorAll('[data-quick-task="1"]').forEach((node) => {
        const text = (node.textContent ?? '').replace(/^☐\s*/, '').trim();
        if (text) lines.push(text);
    });
    return lines;
}


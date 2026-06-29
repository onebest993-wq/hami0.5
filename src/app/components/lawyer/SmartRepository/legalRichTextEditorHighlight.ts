export const LEGAL_HIGHLIGHT_COLORS = ['#E6C67355', '#7DD3A855', '#F08A7855', '#8AB4F855'] as const;

const HIGHLIGHT_SELECTOR = 'mark[data-legal-hl="1"], mark.legal-hl';

export function nodeInEditor(node: Node | null, editor: HTMLElement | null): boolean {
    if (!node || !editor) return false;
    const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
    return Boolean(el && editor.contains(el));
}

export function unwrapElement(el: Element): void {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
}

function normalizeCssColor(value: string): string | null {
    const raw = value.trim().toLowerCase();
    if (!raw || raw === 'transparent' || raw === 'rgba(0, 0, 0, 0)') return null;
    if (raw.startsWith('#')) return raw.length >= 7 ? raw.slice(0, 7) : raw;
    const rgb = /^rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(raw);
    if (!rgb) return raw;
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${hex(Number(rgb[1]))}${hex(Number(rgb[2]))}${hex(Number(rgb[3]))}`;
}

export function matchHighlightColor(cssColor: string | null): string | null {
    if (!cssColor) return null;
    const normalized = normalizeCssColor(cssColor);
    if (!normalized) return null;
    for (const candidate of LEGAL_HIGHLIGHT_COLORS) {
        const base = candidate.slice(0, 7);
        if (normalized === base || normalized.startsWith(base)) return candidate;
    }
    return normalized.length >= 7 ? `${normalized}55` : null;
}

function colorsMatch(a: string, b: string): boolean {
    const na = normalizeCssColor(a);
    const nb = normalizeCssColor(b);
    if (na && nb) return na === nb;
    return a.slice(0, 7) === b.slice(0, 7);
}

function isHighlightEl(el: Element | null): el is HTMLElement {
    if (!el || !(el instanceof HTMLElement)) return false;
    if (el.dataset.legalHl === '1') return true;
    if (el.classList.contains('legal-hl')) return true;
    if (el.tagName === 'MARK') {
        const bg = el.style.backgroundColor || el.style.background;
        return Boolean(matchHighlightColor(bg));
    }
    return false;
}

function closestHighlight(node: Node | null, editor: HTMLElement): HTMLElement | null {
    let current: Node | null = node;
    if (current?.nodeType === Node.TEXT_NODE) current = current.parentElement;
    const el = current as HTMLElement | null;
    if (!el || !editor.contains(el)) return null;
    const marked = el.closest(HIGHLIGHT_SELECTOR) as HTMLElement | null;
    if (marked && editor.contains(marked)) return marked;
    let parent: Element | null = el;
    while (parent && parent !== editor) {
        if (isHighlightEl(parent)) return parent;
        parent = parent.parentElement;
    }
    return null;
}

export function getHighlightAtSelection(editor: HTMLElement): string | null {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return null;
    const range = sel.getRangeAt(0);
    if (!nodeInEditor(range.startContainer, editor)) return null;

    if (!range.collapsed) {
        const uniform = getUniformHighlightColorInRange(range, editor);
        if (uniform) return uniform;
    }

    const marked = closestHighlight(range.startContainer, editor);
    if (!marked) return null;
    const bg = marked.style.backgroundColor || marked.style.background || '';
    return matchHighlightColor(bg);
}

function getUniformHighlightColorInRange(range: Range, editor: HTMLElement): string | null {
    const segments = getTextSegmentsInRange(range, editor);
    if (segments.length === 0) return null;

    let color: string | null = null;
    for (const { node, start, end } of segments) {
        if (!node.nodeValue?.slice(start, end).trim()) continue;
        const probe = document.createRange();
        probe.setStart(node, start);
        probe.setEnd(node, Math.min(end, node.nodeValue.length));
        const mark = closestHighlight(probe.startContainer, editor);
        if (!mark) return null;
        const markColor = matchHighlightColor(mark.style.backgroundColor || mark.style.background || '');
        if (!markColor) return null;
        if (!color) color = markColor;
        else if (!colorsMatch(color, markColor)) return null;
    }
    return color;
}

type TextSegment = { node: Text; start: number; end: number };

function getTextSegmentsInRange(range: Range, editor: HTMLElement): TextSegment[] {
    const segments: TextSegment[] = [];
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let textNode: Text | null;
    while ((textNode = walker.nextNode() as Text | null)) {
        if (!range.intersectsNode(textNode)) continue;
        const len = textNode.nodeValue?.length ?? 0;
        if (!len) continue;
        let start = 0;
        let end = len;
        if (textNode === range.startContainer) start = range.startOffset;
        if (textNode === range.endContainer) end = range.endOffset;
        if (start < end) segments.push({ node: textNode, start, end });
    }
    return segments;
}

function createHighlightMark(color: string): HTMLElement {
    const mark = document.createElement('mark');
    mark.className = 'legal-hl';
    mark.dataset.legalHl = '1';
    mark.style.backgroundColor = color;
    mark.style.color = 'inherit';
    return mark;
}

function wrapTextSegment(textNode: Text, start: number, end: number, color: string): void {
    const value = textNode.nodeValue ?? '';
    if (start >= end || start < 0 || end > value.length) return;

    const before = value.slice(0, start);
    const middle = value.slice(start, end);
    const after = value.slice(end);
    if (!middle) return;

    const parent = textNode.parentNode;
    if (!parent) return;

    const mark = createHighlightMark(color);
    mark.textContent = middle;

    if (after) parent.insertBefore(document.createTextNode(after), textNode.nextSibling);
    parent.insertBefore(mark, textNode.nextSibling);

    if (before) textNode.nodeValue = before;
    else parent.removeChild(textNode);
}

function wrapSelectionWithHighlight(range: Range, editor: HTMLElement, color: string): void {
    const segments = getTextSegmentsInRange(range, editor).filter((seg) =>
        Boolean(seg.node.nodeValue?.slice(seg.start, seg.end).replace(/\u200b/g, '')),
    );
    for (let i = segments.length - 1; i >= 0; i--) {
        const { node, start, end } = segments[i];
        wrapTextSegment(node, start, end, color);
    }
}

function collectIntersectingHighlights(range: Range, editor: HTMLElement): HTMLElement[] {
    const found = new Set<HTMLElement>();
    const segments = getTextSegmentsInRange(range, editor);
    for (const { node, start, end } of segments) {
        const probe = document.createRange();
        probe.setStart(node, start);
        probe.setEnd(node, end);
        const mark = closestHighlight(probe.startContainer, editor);
        if (mark) found.add(mark);
    }
    if (range.collapsed) {
        const mark = closestHighlight(range.startContainer, editor);
        if (mark) found.add(mark);
    }
    return [...found];
}

export function removeHighlightsInRange(range: Range, editor: HTMLElement): void {
    const marks = collectIntersectingHighlights(range, editor);
    for (const mark of marks) unwrapElement(mark);
}

function restoreSelectionAround(node: Node): void {
    const sel = window.getSelection();
    if (!sel) return;
    const next = document.createRange();
    next.selectNodeContents(node);
    next.collapse(false);
    sel.removeAllRanges();
    sel.addRange(next);
}

export function pruneFormatResetSpans(editor: HTMLElement): void {
    editor.querySelectorAll('[data-fmt-reset="1"]').forEach((node) => {
        const text = (node.textContent ?? '').replace(/\u200b/g, '').trim();
        if (!text) node.remove();
    });
}

function collapseCaretAfter(node: Node): void {
    const sel = window.getSelection();
    if (!sel) return;
    const next = document.createRange();
    next.setStartAfter(node);
    next.collapse(true);
    sel.removeAllRanges();
    sel.addRange(next);
}

function collapseCaretInsideText(node: Text, offset: number): void {
    const sel = window.getSelection();
    if (!sel) return;
    const next = document.createRange();
    next.setStart(node, safeTextOffset(node, offset));
    next.collapse(true);
    sel.removeAllRanges();
    sel.addRange(next);
}

function safeTextOffset(node: Node, preferred: number): number {
    if (node.nodeType !== Node.TEXT_NODE) return 0;
    const len = (node as Text).length;
    return Math.max(0, Math.min(preferred, len));
}

/** يوقف التأشير عند موضع المؤشر ويمنع امتداده للنص الجديد */
export function endHighlightAtCursor(editor: HTMLElement): boolean {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return false;
    const range = sel.getRangeAt(0);
    if (!nodeInEditor(range.startContainer, editor)) return false;

    if (!range.collapsed) {
        removeHighlightsInRange(range, editor);
        collapseCaretAfter(range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer : editor);
        pruneFormatResetSpans(editor);
        return true;
    }

    const mark = closestHighlight(range.startContainer, editor);
    if (!mark) {
        pruneFormatResetSpans(editor);
        return false;
    }

    const tailRange = document.createRange();
    tailRange.setStart(range.startContainer, range.startOffset);
    tailRange.setEndAfter(mark.lastChild ?? mark);

    if (tailRange.collapsed) {
        collapseCaretAfter(mark);
        pruneFormatResetSpans(editor);
        return true;
    }

    const tail = tailRange.extractContents();
    mark.parentNode?.insertBefore(tail, mark.nextSibling);

    if (!mark.textContent?.replace(/\u200b/g, '').trim()) {
        unwrapElement(mark);
    }

    const anchor = tail.firstChild ?? mark.nextSibling ?? mark.parentNode;
    if (anchor) {
        if (anchor.nodeType === Node.TEXT_NODE) {
            collapseCaretInsideText(anchor as Text, 0);
        } else {
            collapseCaretAfter(anchor);
        }
    }
    pruneFormatResetSpans(editor);
    return true;
}

export function placeCaretAfterHighlight(editor: HTMLElement): void {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const mark = closestHighlight(sel.getRangeAt(0).startContainer, editor);
    if (mark) {
        collapseCaretAfter(mark);
        return;
    }
    pruneFormatResetSpans(editor);
}

export function applyLegalHighlight(editor: HTMLElement, color: string): boolean {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return false;
    const range = sel.getRangeAt(0);
    if (!nodeInEditor(range.commonAncestorContainer, editor)) return false;

    if (range.collapsed) {
        const mark = closestHighlight(range.startContainer, editor);
        if (!mark) return false;
        const current = matchHighlightColor(mark.style.backgroundColor || mark.style.background || '');
        if (current && colorsMatch(current, color)) {
            endHighlightAtCursor(editor);
            return true;
        }
        mark.style.backgroundColor = color;
        mark.dataset.legalHl = '1';
        mark.classList.add('legal-hl');
        placeCaretAfterHighlight(editor);
        return true;
    }

    const uniform = getUniformHighlightColorInRange(range, editor);
    if (uniform && colorsMatch(uniform, color)) {
        removeHighlightsInRange(range, editor);
        endHighlightAtCursor(editor);
        return true;
    }

    removeHighlightsInRange(range, editor);
    wrapSelectionWithHighlight(range, editor, color);
    placeCaretAfterHighlight(editor);
    pruneFormatResetSpans(editor);
    return true;
}

export function removeLegalHighlight(editor: HTMLElement): boolean {
    const sel = window.getSelection();
    if (!sel?.rangeCount) return false;
    const range = sel.getRangeAt(0);
    if (!nodeInEditor(range.commonAncestorContainer, editor)) return false;

    if (range.collapsed) {
        return endHighlightAtCursor(editor);
    }

    const marks = collectIntersectingHighlights(range, editor);
    if (marks.length === 0) return false;
    for (const mark of marks) unwrapElement(mark);
    endHighlightAtCursor(editor);
    pruneFormatResetSpans(editor);
    return true;
}

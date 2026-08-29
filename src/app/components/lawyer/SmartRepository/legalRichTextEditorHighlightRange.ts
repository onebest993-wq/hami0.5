import { highlightColorsMatch, matchHighlightColor } from './legalRichTextEditorHighlightColors';
import { nodeInEditor, unwrapElement } from './legalRichTextEditorHighlightDom';

const HIGHLIGHT_SELECTOR = 'mark[data-legal-hl="1"], mark.legal-hl';

type TextSegment = { node: Text; start: number; end: number };

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

export function closestHighlight(node: Node | null, editor: HTMLElement): HTMLElement | null {
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

export function getTextSegmentsInRange(range: Range, editor: HTMLElement): TextSegment[] {
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

export function getUniformHighlightColorInRange(range: Range, editor: HTMLElement): string | null {
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
        else if (!highlightColorsMatch(color, markColor)) return null;
    }
    return color;
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

export function wrapSelectionWithHighlight(range: Range, editor: HTMLElement, color: string): void {
    const segments = getTextSegmentsInRange(range, editor).filter((seg) =>
        Boolean(seg.node.nodeValue?.slice(seg.start, seg.end).replace(/\u200b/g, '')),
    );
    for (let i = segments.length - 1; i >= 0; i--) {
        const { node, start, end } = segments[i];
        wrapTextSegment(node, start, end, color);
    }
}

export function collectIntersectingHighlights(range: Range, editor: HTMLElement): HTMLElement[] {
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

export { LEGAL_HIGHLIGHT_COLORS } from './legalRichTextEditorHighlightColors';
export { nodeInEditor, unwrapElement, pruneFormatResetSpans } from './legalRichTextEditorHighlightDom';
export { getHighlightAtSelection } from './legalRichTextEditorHighlightRange';

import { highlightColorsMatch, matchHighlightColor } from './legalRichTextEditorHighlightColors';
import {
    collapseCaretAfter,
    collapseCaretInsideText,
    nodeInEditor,
    pruneFormatResetSpans,
    unwrapElement,
} from './legalRichTextEditorHighlightDom';
import {
    closestHighlight,
    collectIntersectingHighlights,
    getUniformHighlightColorInRange,
    removeHighlightsInRange,
    wrapSelectionWithHighlight,
} from './legalRichTextEditorHighlightRange';

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
        if (current && highlightColorsMatch(current, color)) {
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
    if (uniform && highlightColorsMatch(uniform, color)) {
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

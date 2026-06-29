// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
    applyLegalHighlight,
    endHighlightAtCursor,
    getHighlightAtSelection,
    LEGAL_HIGHLIGHT_COLORS,
    removeLegalHighlight,
} from '../legalRichTextEditorHighlight';

function mountEditor(html = 'نص تجريبي للتأشير') {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.innerHTML = `<p>${html}</p>`;
    document.body.appendChild(editor);
    return editor;
}

function selectText(editor: HTMLElement, text: string) {
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
    let node: Text | null;
    while ((node = walker.nextNode() as Text | null)) {
        const idx = node.nodeValue?.indexOf(text) ?? -1;
        if (idx >= 0) {
            const range = document.createRange();
            range.setStart(node, idx);
            range.setEnd(node, idx + text.length);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            return range;
        }
    }
    throw new Error(`text not found: ${text}`);
}

describe('legalRichTextEditorHighlight', () => {
    it('wraps selected text in mark without deleting content', () => {
        const editor = mountEditor();
        selectText(editor, 'تجريبي');
        const color = LEGAL_HIGHLIGHT_COLORS[0];
        expect(applyLegalHighlight(editor, color)).toBe(true);
        expect(editor.querySelector('mark[data-legal-hl="1"]')?.textContent).toBe('تجريبي');
        expect(editor.textContent).toContain('نص تجريبي للتأشير');
        editor.remove();
    });

    it('toggles off the same highlight color on second apply', () => {
        const editor = mountEditor();
        selectText(editor, 'تجريبي');
        const color = LEGAL_HIGHLIGHT_COLORS[1];
        applyLegalHighlight(editor, color);
        selectText(editor, 'تجريبي');
        applyLegalHighlight(editor, color);
        expect(editor.querySelector('mark[data-legal-hl="1"]')).toBeNull();
        expect(editor.textContent).toContain('تجريبي');
        editor.remove();
    });

    it('removes highlight with eraser helper', () => {
        const editor = mountEditor();
        selectText(editor, 'للتأشير');
        applyLegalHighlight(editor, LEGAL_HIGHLIGHT_COLORS[2]);
        selectText(editor, 'للتأشير');
        expect(getHighlightAtSelection(editor)).toBeTruthy();
        expect(removeLegalHighlight(editor)).toBe(true);
        expect(editor.querySelector('mark')).toBeNull();
        editor.remove();
    });

    it('ends highlight at cursor without removing earlier highlighted text', () => {
        const editor = mountEditor('قبل بعد');
        selectText(editor, 'قبل');
        applyLegalHighlight(editor, LEGAL_HIGHLIGHT_COLORS[0]);
        const afterNode = editor.querySelector('p')?.lastChild as Text;
        const range = document.createRange();
        range.setStart(afterNode, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        endHighlightAtCursor(editor);
        expect(editor.querySelector('mark')?.textContent).toBe('قبل');
        expect(editor.textContent).toContain('بعد');
        editor.remove();
    });
});

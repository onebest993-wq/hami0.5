import { useCallback, useRef, type RefObject } from 'react';
import { DEFAULT_TEXT_COLOR } from './legalRichTextEditorConstants';
import { insertFormatResetSpan } from './legalRichTextEditorUtils';
import {
    applyLegalHighlight,
    endHighlightAtCursor,
    getHighlightAtSelection,
    nodeInEditor,
    placeCaretAfterHighlight,
    pruneFormatResetSpans,
    removeLegalHighlight,
    unwrapElement,
} from './legalRichTextEditorHighlight';

type UseLegalRichTextEditorHighlightModeParams = {
    editorRef: RefObject<HTMLDivElement | null>;
    emitChange: () => void;
    focusEditor: () => void;
    setActiveBold: (value: boolean) => void;
    setActiveForeColor: (value: string | null) => void;
    setActiveHighlightColor: (value: string | null) => void;
};

export function useLegalRichTextEditorHighlightMode({
    editorRef,
    emitChange,
    focusEditor,
    setActiveBold,
    setActiveForeColor,
    setActiveHighlightColor,
}: UseLegalRichTextEditorHighlightModeParams) {
    const highlightModeColorRef = useRef<string | null>(null);

    const applyHighlightColor = useCallback(
        (color: string) => {
            const editor = editorRef.current;
            if (!editor) return;
            focusEditor();
            setActiveForeColor(null);

            const sel = window.getSelection();
            const collapsed = Boolean(sel && sel.rangeCount > 0 && sel.getRangeAt(0).collapsed);
            const inExisting = getHighlightAtSelection(editor);

            if (collapsed && !inExisting) {
                const turningOff = highlightModeColorRef.current === color;
                highlightModeColorRef.current = turningOff ? null : color;
                setActiveHighlightColor(turningOff ? null : color);
                pruneFormatResetSpans(editor);
                emitChange();
                requestAnimationFrame(() => focusEditor());
                return;
            }

            highlightModeColorRef.current = null;
            const hadSelection = Boolean(sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed);
            applyLegalHighlight(editor, color);
            setActiveHighlightColor(getHighlightAtSelection(editor));
            emitChange();

            if (hadSelection || collapsed) {
                requestAnimationFrame(() => focusEditor());
            }
        },
        [editorRef, emitChange, focusEditor, setActiveForeColor, setActiveHighlightColor],
    );

    const clearHighlight = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;
        focusEditor();
        highlightModeColorRef.current = null;

        const sel = window.getSelection();
        const hasSelection = Boolean(
            sel && sel.rangeCount > 0 && nodeInEditor(sel.anchorNode, editor) && !sel.getRangeAt(0).collapsed,
        );

        if (hasSelection) {
            removeLegalHighlight(editor);
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand('removeFormat', false);
            document.execCommand('foreColor', false, DEFAULT_TEXT_COLOR);
            editor.querySelectorAll('mark[data-legal-hl], mark.legal-hl').forEach((node) => {
                if (editor.contains(node)) unwrapElement(node);
            });
        } else {
            removeLegalHighlight(editor);
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand('removeFormat', false);
            document.execCommand('foreColor', false, DEFAULT_TEXT_COLOR);
            insertFormatResetSpan(editor, DEFAULT_TEXT_COLOR);
        }

        setActiveBold(false);
        setActiveForeColor(null);
        setActiveHighlightColor(null);
        pruneFormatResetSpans(editor);
        emitChange();
        requestAnimationFrame(() => focusEditor());
    }, [
        editorRef,
        emitChange,
        focusEditor,
        setActiveBold,
        setActiveForeColor,
        setActiveHighlightColor,
    ]);

    const handleBeforeInput = useCallback(
        (e: React.FormEvent<HTMLDivElement> & { nativeEvent: InputEvent }) => {
            const editor = editorRef.current;
            const color = highlightModeColorRef.current;
            const inputType = e.nativeEvent.inputType;
            const data = e.nativeEvent.data;
            if (!editor || inputType !== 'insertText' || !data) return;

            if (color && data === ' ') {
                e.preventDefault();
                highlightModeColorRef.current = null;
                endHighlightAtCursor(editor);
                document.execCommand('insertText', false, ' ');
                setActiveHighlightColor(null);
                emitChange();
                return;
            }

            if (!color) return;

            e.preventDefault();
            focusEditor();
            const escaped = data
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            document.execCommand(
                'insertHTML',
                false,
                `<mark class="legal-hl" data-legal-hl="1" style="background-color:${color};color:inherit;">${escaped}</mark>`,
            );
            placeCaretAfterHighlight(editor);
            pruneFormatResetSpans(editor);
            emitChange();
            setActiveHighlightColor(color);
        },
        [editorRef, emitChange, focusEditor, setActiveHighlightColor],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (e.key !== ' ' || e.ctrlKey || e.metaKey || e.altKey) return;
            if (!highlightModeColorRef.current) return;
            const editor = editorRef.current;
            if (!editor) return;
            highlightModeColorRef.current = null;
            endHighlightAtCursor(editor);
            setActiveHighlightColor(null);
        },
        [editorRef, setActiveHighlightColor],
    );

    return {
        highlightModeColorRef,
        applyHighlightColor,
        clearHighlight,
        handleBeforeInput,
        handleKeyDown,
    };
}

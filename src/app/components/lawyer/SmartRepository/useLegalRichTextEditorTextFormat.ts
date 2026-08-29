import { useCallback, type Dispatch, type MutableRefObject, type RefObject, type SetStateAction } from 'react';
import { DEFAULT_TEXT_COLOR, FONT_SIZES } from './legalRichTextEditorConstants';
import { applyForeColorToSelection, insertFormatResetSpan } from './legalRichTextEditorUtils';
import { nodeInEditor } from './legalRichTextEditorHighlight';

type UseLegalRichTextEditorTextFormatParams = {
    editorRef: RefObject<HTMLDivElement | null>;
    emitChange: () => void;
    focusEditor: () => void;
    highlightModeColorRef: MutableRefObject<string | null>;
    activeBold: boolean;
    setActiveBold: Dispatch<SetStateAction<boolean>>;
    activeForeColor: string | null;
    setActiveForeColor: Dispatch<SetStateAction<string | null>>;
    setActiveHighlightColor: Dispatch<SetStateAction<string | null>>;
};

function insertNeutralSpan(style: string): void {
    document.execCommand('insertHTML', false, `<span style="${style}">&#8203;</span>`);
}

export function useLegalRichTextEditorTextFormat({
    editorRef,
    emitChange,
    focusEditor,
    highlightModeColorRef,
    activeBold,
    setActiveBold,
    activeForeColor,
    setActiveForeColor,
    setActiveHighlightColor,
}: UseLegalRichTextEditorTextFormatParams) {
    const exec = useCallback(
        (command: string, commandValue?: string) => {
            focusEditor();
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand(command, false, commandValue);
            emitChange();
        },
        [emitChange, focusEditor],
    );

    const toggleBold = useCallback(() => {
        focusEditor();
        if (activeBold) {
            exec('removeFormat');
            setActiveBold(false);
            return;
        }
        exec('bold');
        setActiveBold(true);
    }, [activeBold, exec, focusEditor, setActiveBold]);

    const toggleForeColor = useCallback(
        (color: string) => {
            const editor = editorRef.current;
            if (!editor) return;

            const selBefore = window.getSelection();
            const savedRange =
                selBefore &&
                selBefore.rangeCount > 0 &&
                nodeInEditor(selBefore.anchorNode, editor)
                    ? selBefore.getRangeAt(0).cloneRange()
                    : null;

            focusEditor();
            highlightModeColorRef.current = null;
            setActiveHighlightColor(null);

            if (savedRange) {
                const sel = window.getSelection();
                if (sel) {
                    sel.removeAllRanges();
                    sel.addRange(savedRange);
                }
            }

            const sel = window.getSelection();
            const hasSelection = Boolean(
                sel &&
                    sel.rangeCount > 0 &&
                    nodeInEditor(sel.anchorNode, editor) &&
                    !sel.getRangeAt(0).collapsed,
            );

            if (activeForeColor === color) {
                if (hasSelection) {
                    applyForeColorToSelection(DEFAULT_TEXT_COLOR);
                } else {
                    document.execCommand('styleWithCSS', false, 'true');
                    document.execCommand('foreColor', false, DEFAULT_TEXT_COLOR);
                    insertFormatResetSpan(editor, DEFAULT_TEXT_COLOR);
                }
                setActiveForeColor(null);
                emitChange();
                requestAnimationFrame(() => focusEditor());
                return;
            }

            if (hasSelection) {
                applyForeColorToSelection(color);
            } else {
                insertNeutralSpan(`color:${color}`);
            }
            setActiveForeColor(color);
            emitChange();
            requestAnimationFrame(() => focusEditor());
        },
        [
            activeForeColor,
            editorRef,
            emitChange,
            focusEditor,
            highlightModeColorRef,
            setActiveForeColor,
            setActiveHighlightColor,
        ],
    );

    const applyFontSize = useCallback(
        (sizeValue: string) => {
            const preset = FONT_SIZES.find((s) => s.value === sizeValue);
            const fontSize = preset?.css ?? '1em';
            const editor = editorRef.current;
            if (!editor) return;
            focusEditor();

            const sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) {
                insertNeutralSpan(`font-size:${fontSize}`);
                emitChange();
                return;
            }

            const range = sel.getRangeAt(0);
            if (range.collapsed) {
                insertNeutralSpan(`font-size:${fontSize}`);
                emitChange();
                return;
            }

            const span = document.createElement('span');
            span.style.fontSize = fontSize;
            span.appendChild(range.extractContents());
            range.insertNode(span);
            sel.removeAllRanges();
            const nextRange = document.createRange();
            nextRange.selectNodeContents(span);
            nextRange.collapse(false);
            sel.addRange(nextRange);
            emitChange();
        },
        [editorRef, emitChange, focusEditor],
    );

    return { toggleBold, toggleForeColor, applyFontSize };
}

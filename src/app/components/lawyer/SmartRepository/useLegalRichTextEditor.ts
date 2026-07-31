import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { DEFAULT_TEXT_COLOR, FONT_SIZES } from './legalRichTextEditorConstants';
import {
    applyForeColorToSelection,
    insertFormatResetSpan,
    sanitizeRichNoteHtml,
} from './legalRichTextEditorUtils';
import {
    applyLegalHighlight,
    getHighlightAtSelection,
    nodeInEditor,
    placeCaretAfterHighlight,
    pruneFormatResetSpans,
    removeLegalHighlight,
} from './legalRichTextEditorHighlight';

export type LegalRichTextEditorHandle = {
    getHtml: () => string;
};

type UseLegalRichTextEditorParams = {
    value: string;
    onChange: (html: string) => void;
    onBlur?: () => void;
    ref: Ref<LegalRichTextEditorHandle>;
};

export function useLegalRichTextEditor({ value, onChange, onBlur, ref }: UseLegalRichTextEditorParams) {
    const editorRef = useRef<HTMLDivElement>(null);
    const highlightModeColorRef = useRef<string | null>(null);
    const [activeBold, setActiveBold] = useState(false);
    const [activeForeColor, setActiveForeColor] = useState<string | null>(null);
    const [activeHighlightColor, setActiveHighlightColor] = useState<string | null>(null);

    useImperativeHandle(ref, () => ({
        getHtml: () => sanitizeRichNoteHtml(editorRef.current?.innerHTML ?? ''),
    }), []);

    useEffect(() => {
        const el = editorRef.current;
        if (!el) return;
        const safe = sanitizeRichNoteHtml(value || '');
        const currentSafe = sanitizeRichNoteHtml(el.innerHTML);
        if (currentSafe !== safe) {
            const doc = new DOMParser().parseFromString(`<body>${safe || ''}</body>`, 'text/html');
            el.replaceChildren(...Array.from(doc.body.childNodes));
        }
    }, [value]);

    const focusEditor = useCallback(() => {
        editorRef.current?.focus();
    }, []);

    const emitChange = useCallback(() => {
        const editor = editorRef.current;
        if (editor) pruneFormatResetSpans(editor);
        onChange(sanitizeRichNoteHtml(editorRef.current?.innerHTML ?? ''));
    }, [onChange]);

    const exec = useCallback(
        (command: string, commandValue?: string) => {
            focusEditor();
            document.execCommand('styleWithCSS', false, 'true');
            document.execCommand(command, false, commandValue);
            emitChange();
        },
        [emitChange, focusEditor],
    );

    const syncToolbarFromSelection = useCallback(() => {
        const editor = editorRef.current;
        const sel = window.getSelection();
        if (!editor || !sel || !nodeInEditor(sel.anchorNode, editor)) return;

        setActiveBold(document.queryCommandState('bold'));
        if (highlightModeColorRef.current) {
            setActiveHighlightColor(highlightModeColorRef.current);
            return;
        }
        setActiveHighlightColor(getHighlightAtSelection(editor));
    }, []);

    const handleInput = useCallback(() => {
        emitChange();
        syncToolbarFromSelection();
    }, [emitChange, syncToolbarFromSelection]);

    const handleBlur = useCallback(() => {
        emitChange();
        onBlur?.();
    }, [emitChange, onBlur]);

    const toggleBold = useCallback(() => {
        focusEditor();
        if (activeBold) {
            exec('removeFormat');
            setActiveBold(false);
            return;
        }
        exec('bold');
        setActiveBold(true);
    }, [activeBold, exec, focusEditor]);

    const toggleForeColor = useCallback(
        (color: string) => {
            const editor = editorRef.current;
            if (!editor) return;

            // احفظ التحديد قبل التركيز — نقر شريط الأدوات قد يُسقطه في بعض المتصفحات
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
                document.execCommand(
                    'insertHTML',
                    false,
                    `<span style="color:${color}">&#8203;</span>`,
                );
            }
            setActiveForeColor(color);
            emitChange();
            requestAnimationFrame(() => focusEditor());
        },
        [activeForeColor, emitChange, focusEditor],
    );

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
        [emitChange, focusEditor],
    );

    const clearHighlight = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;
        focusEditor();
        highlightModeColorRef.current = null;
        removeLegalHighlight(editor);
        setActiveHighlightColor(null);
        emitChange();
        requestAnimationFrame(() => focusEditor());
    }, [emitChange, focusEditor]);

    const handleBeforeInput = useCallback(
        (e: React.FormEvent<HTMLDivElement> & { nativeEvent: InputEvent }) => {
            const editor = editorRef.current;
            const color = highlightModeColorRef.current;
            const inputType = e.nativeEvent.inputType;
            const data = e.nativeEvent.data;
            if (!editor || !color || inputType !== 'insertText' || !data) return;

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
        [emitChange, focusEditor],
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
                document.execCommand(
                    'insertHTML',
                    false,
                    `<span style="font-size:${fontSize}">&#8203;</span>`,
                );
                emitChange();
                return;
            }

            const range = sel.getRangeAt(0);
            if (range.collapsed) {
                document.execCommand(
                    'insertHTML',
                    false,
                    `<span style="font-size:${fontSize}">&#8203;</span>`,
                );
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
        [emitChange, focusEditor],
    );

    return {
        editorRef,
        activeBold,
        activeForeColor,
        activeHighlightColor,
        exec,
        applyFontSize,
        toggleBold,
        toggleForeColor,
        applyHighlightColor,
        clearHighlight,
        handleInput,
        handleBeforeInput,
        handleBlur,
        syncToolbarFromSelection,
    };
}

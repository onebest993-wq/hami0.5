import { useCallback, useEffect, useImperativeHandle, useRef, useState, type ClipboardEvent, type Ref } from 'react';
import {
    clipboardPayloadToEditorHtml,
    sanitizeRichNoteHtml,
} from './legalRichTextEditorUtils';
import {
    getHighlightAtSelection,
    nodeInEditor,
    pruneFormatResetSpans,
} from './legalRichTextEditorHighlight';
import { useLegalRichTextEditorHighlightMode } from './useLegalRichTextEditorHighlightMode';
import { useLegalRichTextEditorTextFormat } from './useLegalRichTextEditorTextFormat';

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

    const {
        highlightModeColorRef,
        applyHighlightColor,
        clearHighlight,
        handleBeforeInput,
        handleKeyDown,
    } = useLegalRichTextEditorHighlightMode({
        editorRef,
        emitChange,
        focusEditor,
        setActiveBold,
        setActiveForeColor,
        setActiveHighlightColor,
    });

    const { toggleBold, toggleForeColor, applyFontSize } = useLegalRichTextEditorTextFormat({
        editorRef,
        emitChange,
        focusEditor,
        highlightModeColorRef,
        activeBold,
        setActiveBold,
        activeForeColor,
        setActiveForeColor,
        setActiveHighlightColor,
    });

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
    }, [highlightModeColorRef]);

    const handleInput = useCallback(() => {
        emitChange();
        syncToolbarFromSelection();
    }, [emitChange, syncToolbarFromSelection]);

    const handlePaste = useCallback((e: ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const html = e.clipboardData.getData('text/html');
        const text = e.clipboardData.getData('text/plain');
        document.execCommand(
            'insertHTML',
            false,
            sanitizeRichNoteHtml(clipboardPayloadToEditorHtml(html, text)),
        );
        emitChange();
    }, [emitChange]);

    const handleBlur = useCallback(() => {
        emitChange();
        onBlur?.();
    }, [emitChange, onBlur]);

    return {
        editorRef,
        activeBold,
        activeForeColor,
        activeHighlightColor,
        applyFontSize,
        toggleBold,
        toggleForeColor,
        applyHighlightColor,
        clearHighlight,
        handleInput,
        handleBeforeInput,
        handleKeyDown,
        handlePaste,
        handleBlur,
        syncToolbarFromSelection,
    };
}

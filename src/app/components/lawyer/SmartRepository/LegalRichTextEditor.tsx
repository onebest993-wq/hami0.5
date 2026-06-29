import React, { forwardRef } from 'react';
import { LegalRichTextEditorToolbar } from './LegalRichTextEditorToolbar';
import { useLegalRichTextEditor, type LegalRichTextEditorHandle } from './useLegalRichTextEditor';

export type { LegalRichTextEditorHandle };

type LegalRichTextEditorProps = {
    value: string;
    onChange: (html: string) => void;
    onBlur?: () => void;
    placeholder?: string;
    testId?: string;
    expanded?: boolean;
};

export const LegalRichTextEditor = forwardRef<LegalRichTextEditorHandle, LegalRichTextEditorProps>(
    function LegalRichTextEditor(
        {
            value,
            onChange,
            onBlur,
            placeholder = 'اكتب ملاحظتك هنا…',
            testId = 'repository-rich-editor',
            expanded = true,
        },
        ref,
    ) {
        const editor = useLegalRichTextEditor({ value, onChange, onBlur, ref });

        return (
            <div className="flex flex-col gap-2" data-testid={testId}>
                <LegalRichTextEditorToolbar
                    activeBold={editor.activeBold}
                    activeForeColor={editor.activeForeColor}
                    activeHighlightColor={editor.activeHighlightColor}
                    onToggleBold={editor.toggleBold}
                    onFontSize={(size) => editor.exec('fontSize', size)}
                    onToggleForeColor={editor.toggleForeColor}
                    onApplyHighlightColor={editor.applyHighlightColor}
                    onClearHighlight={editor.clearHighlight}
                />
                <div
                    ref={editor.editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={editor.handleInput}
                    onBeforeInput={editor.handleBeforeInput}
                    onBlur={editor.handleBlur}
                    onKeyUp={editor.syncToolbarFromSelection}
                    onMouseUp={editor.syncToolbarFromSelection}
                    data-placeholder={placeholder}
                    className={`overflow-y-auto w-full rounded-xl border border-white/[0.12] bg-[#0A0F1C]/70 px-4 py-3 text-[#F4F0E8] text-right outline-none focus:border-[#E6C673]/45 focus:ring-1 focus:ring-[#E6C673]/18 empty:before:content-[attr(data-placeholder)] empty:before:text-white/30 ${
                        expanded ? 'min-h-[min(42vh,360px)] max-h-[min(52vh,480px)]' : 'min-h-[160px] max-h-[32vh]'
                    }`}
                    dir="rtl"
                />
            </div>
        );
    },
);

LegalRichTextEditor.displayName = 'LegalRichTextEditor';

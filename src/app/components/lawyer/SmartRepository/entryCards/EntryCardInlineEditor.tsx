import React from 'react';
import { DossierLawArticleRichEditor } from '@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor';
import { REPO_BTN_GOLD, REPO_INPUT } from '../smartRepositoryTheme';

type EntryCardInlineEditorProps = {
    title: string;
    bodyHtml: string;
    editorReady: boolean;
    saveTestId?: string;
    onTitleChange: (value: string) => void;
    onBodyChange: (html: string) => void;
    onSave: () => void;
    onCancel: () => void;
};

export function EntryCardInlineEditor({
    title,
    bodyHtml,
    editorReady,
    saveTestId,
    onTitleChange,
    onBodyChange,
    onSave,
    onCancel,
}: EntryCardInlineEditorProps) {
    return (
        <div className="space-y-3">
            <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className={REPO_INPUT}
                data-testid="repository-note-title"
            />
            {editorReady ? (
                <DossierLawArticleRichEditor
                    value={bodyHtml}
                    onChange={onBodyChange}
                    context={{ kind: 'repository' }}
                />
            ) : (
                <p className="text-xs text-white/45 py-2">جاري تجهيز المحرر…</p>
            )}
            <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onSave} className={REPO_BTN_GOLD} data-testid={saveTestId}>
                    حفظ
                </button>
                <button type="button" onClick={onCancel} className="inline-flex items-center min-h-[44px] px-4 rounded-xl text-sm text-white/55 touch-manipulation">
                    إلغاء
                </button>
            </div>
        </div>
    );
}

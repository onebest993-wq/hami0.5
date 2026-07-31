import React, { Suspense, lazy } from 'react';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { REPO_BTN_GOLD, REPO_INPUT } from '../smartRepositoryTheme';

const LazyDossierLawArticleRichEditor = lazy(() =>
    import('@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor').then((m) => ({
        default: m.DossierLawArticleRichEditor,
    })),
);

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
    const keyboardInset = useMobileKeyboardInset();
    return (
        <div
            className="space-y-3"
            data-testid="repository-inline-editor"
            style={
                keyboardInset > 0
                    ? { paddingBottom: `max(0.75rem, ${keyboardInset}px)` }
                    : undefined
            }
        >            <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className={REPO_INPUT}
                data-testid="repository-note-title"
                     />
            {editorReady ? (
                <Suspense
                    fallback={<p className="text-xs text-white/45 py-2">جاري تجهيز المحرر…</p>}
                >
                    <LazyDossierLawArticleRichEditor
                        value={bodyHtml}
                        onChange={onBodyChange}
                        context={{ kind: 'repository' }}
                    />
                </Suspense>
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

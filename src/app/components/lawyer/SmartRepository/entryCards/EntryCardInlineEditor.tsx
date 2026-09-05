import React, { Suspense, lazy } from 'react';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import {
    REPO_COMPOSE_CANCEL,
    REPO_COMPOSE_FOOTER,
    REPO_COMPOSE_SAVE,
    REPO_COMPOSE_TITLE,
} from '../smartRepositoryTheme';

const LazyDossierLawArticleRichEditor = lazy(() =>
    import('@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor').then((m) => ({
        default: m.DossierLawArticleRichEditor,
    })),
);

export type EntryCardInlineEditorProps = {
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
            className="space-y-2.5"
            data-testid="repository-inline-editor"
            style={
                keyboardInset > 0
                    ? { paddingBottom: `max(0.75rem, ${keyboardInset}px)` }
                    : undefined
            }
        >
            <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="عنوان المسودة"
                className={REPO_COMPOSE_TITLE}
                data-testid="repository-note-title"
                aria-label="عنوان المسودة"
                enterKeyHint="next"
                autoComplete="off"
                autoCapitalize="sentences"
            />
            {editorReady ? (
                <Suspense
                    fallback={
                        <div
                            className="min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.035]"
                            aria-busy="true"
                            aria-label="المحرر"
                        />
                    }
                >
                    <LazyDossierLawArticleRichEditor
                        value={bodyHtml}
                        onChange={onBodyChange}
                        context={{ kind: 'repository' }}
                        compact
                        expanded={false}
                    />
                </Suspense>
            ) : (
                <div
                    className="min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.035]"
                    aria-busy="true"
                    aria-label="المحرر"
                />
            )}
            <footer className={REPO_COMPOSE_FOOTER}>
                <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
                    <button type="button" onClick={onCancel} className={REPO_COMPOSE_CANCEL}>
                        إلغاء
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        className={REPO_COMPOSE_SAVE}
                        data-testid={saveTestId}
                    >
                        حفظ
                    </button>
                </div>
            </footer>
        </div>
    );
}

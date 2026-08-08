import React, { memo, useEffect, useMemo } from 'react';
import { Loader2, Paperclip, Pin, PinOff, Save, X } from '@/app/components/ui/lucideIcons';
import type { RefObject } from 'react';
import type { DossierLawArticleRichEditorHandle } from '@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { isVaultImageFile } from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';
import {
    REPO_COMPOSE_ATTACH_CHIP,
    REPO_COMPOSE_CANCEL,
    REPO_COMPOSE_FOOTER,
    REPO_COMPOSE_ICON_BTN,
    REPO_COMPOSE_ICON_BTN_ACTIVE,
    REPO_COMPOSE_META,
    REPO_COMPOSE_SAVE,
    REPO_COMPOSE_SHELL,
    REPO_COMPOSE_TITLE,
} from './smartRepositoryTheme';
import { RepositoryRichEditor } from './RepositoryLazyPanels';

type RepositoryComposePanelProps = {
    title: string;
    bodyHtml: string;
    isPinned: boolean;
    attachmentFile: File | null;
    saving: boolean;
    editorRef: RefObject<DossierLawArticleRichEditorHandle | null>;
    attachInputRef: RefObject<HTMLInputElement | null>;
    onTitleChange: (value: string) => void;
    onBodyChange: (html: string) => void;
    onAttachmentChange: (file: File | null) => void;
    onTogglePinned: () => void;
    onSave: () => void;
    onCancel: () => void;
};

function formatComposeTimestamp(): string {
    return new Date().toLocaleString('ar-EG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export const RepositoryComposePanel = memo(function RepositoryComposePanel({
    title,
    bodyHtml,
    isPinned,
    attachmentFile,
    saving,
    editorRef,
    attachInputRef,
    onTitleChange,
    onBodyChange,
    onAttachmentChange,
    onTogglePinned,
    onSave,
    onCancel,
}: RepositoryComposePanelProps) {
    const keyboardInset = useMobileKeyboardInset();
    const composedAt = useMemo(() => formatComposeTimestamp(), []);
    const attachmentPreviewUrl = useMemo(() => {
        if (!attachmentFile || !isVaultImageFile(attachmentFile)) return undefined;
        try {
            return URL.createObjectURL(attachmentFile);
        } catch {
            return undefined;
        }
    }, [attachmentFile]);

    useEffect(() => () => revokeBlobUrlIfNeeded(attachmentPreviewUrl), [attachmentPreviewUrl]);

    return (
        <div
            className={REPO_COMPOSE_SHELL}
            data-testid="repository-notepad-editor"
            style={
                keyboardInset > 0
                    ? { paddingBottom: `max(0.75rem, ${keyboardInset}px)` }
                    : undefined
            }
        >
            <div className="flex items-center justify-between gap-2">
                <span className={REPO_COMPOSE_META}>مسودة جديدة</span>
                <time className={REPO_COMPOSE_META} dateTime={new Date().toISOString()}>
                    {composedAt}
                </time>
            </div>

            <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="عنوان المسودة"
                className={REPO_COMPOSE_TITLE}
                aria-label="عنوان المسودة"
            />

            <RepositoryRichEditor editorRef={editorRef} value={bodyHtml} onChange={onBodyChange} compact />

            <footer className={REPO_COMPOSE_FOOTER}>
                <div className="flex items-center gap-1.5 min-w-0">
                    <label
                        className={REPO_COMPOSE_ICON_BTN}
                        title="إرفاق ملف"
                        aria-label="إرفاق ملف"
                    >
                        <Paperclip size={16} aria-hidden />
                        <input
                            ref={attachInputRef}
                            type="file"
                            accept="image/*,application/pdf,.pdf"
                            className="sr-only"
                            onChange={(e) => onAttachmentChange(e.target.files?.[0] ?? null)}
                        />
                    </label>

                    <button
                        type="button"
                        onClick={onTogglePinned}
                        data-testid="repository-compose-pin"
                        className={isPinned ? REPO_COMPOSE_ICON_BTN_ACTIVE : REPO_COMPOSE_ICON_BTN}
                        aria-label={isPinned ? 'إلغاء التثبيت من الواجهة' : 'تثبيت في بطاقة التثبيت'}
                        aria-pressed={isPinned}
                        title={isPinned ? 'مثبّتة في الواجهة' : 'تثبيت في الواجهة'}
                    >
                        {isPinned ? <PinOff size={16} aria-hidden /> : <Pin size={16} aria-hidden />}
                    </button>

                    {attachmentFile ? (
                        <div className={REPO_COMPOSE_ATTACH_CHIP}>
                            {attachmentPreviewUrl ? (
                                <span className="size-5 shrink-0 overflow-hidden rounded border border-white/10">
                                    <img
                                        src={attachmentPreviewUrl}
                                        alt=""
                                        className="size-full object-cover"
                                        loading="eager"
                                        decoding="async"
                                    />
                                </span>
                            ) : null}
                            <span className="truncate">{attachmentFile.name}</span>
                            <button
                                type="button"
                                onClick={() => onAttachmentChange(null)}
                                className="inline-flex shrink-0 items-center justify-center rounded-md p-0.5 text-white/40 hover:text-white/75 touch-manipulation"
                                aria-label="إزالة المرفق"
                            >
                                <X size={12} aria-hidden />
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
                    <button type="button" onClick={onCancel} className={REPO_COMPOSE_CANCEL}>
                        إلغاء
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={onSave}
                        className={REPO_COMPOSE_SAVE}
                        data-testid="repository-note-save"
                    >
                        {saving ? (
                            <Loader2 size={14} className="animate-spin" aria-hidden />
                        ) : (
                            <Save size={14} aria-hidden />
                        )}
                        حفظ
                    </button>
                </div>
            </footer>
        </div>
    );
});

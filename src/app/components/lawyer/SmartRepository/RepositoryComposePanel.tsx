import React, { memo, useEffect, useMemo } from 'react';
import { Loader2, Save } from 'lucide-react';
import type { RefObject } from 'react';
import type { DossierLawArticleRichEditorHandle } from '@/app/components/lawyer/dossier-notes/DossierLawArticleRichEditor';
import { isVaultImageFile } from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';
import { REPO_BTN_GOLD, REPO_INPUT, REPO_TOUCH_CHIP } from './smartRepositoryTheme';
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
            className="rounded-2xl border border-[#E6C673]/22 bg-[#0A0F1C]/60 p-4 space-y-3 mb-4"
            data-testid="repository-notepad-editor"
        >
            <p className="text-[11px] text-white/45">
                {new Date().toLocaleString('ar-EG', {
                    weekday: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </p>
            <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="عنوان البطاقة"
                className={REPO_INPUT}
            />
            <RepositoryRichEditor editorRef={editorRef} value={bodyHtml} onChange={onBodyChange} />
            <div className="flex flex-wrap items-center gap-2">
                <label className={`${REPO_BTN_GOLD} cursor-pointer`}>
                    إرفاق ملف
                    <input
                        ref={attachInputRef}
                        type="file"
                        accept="image/*,application/pdf,.pdf"
                        className="sr-only"
                        onChange={(e) => onAttachmentChange(e.target.files?.[0] ?? null)}
                    />
                </label>
                {attachmentFile ? (
                    <div className="flex items-center gap-2 min-w-0">
                        {attachmentPreviewUrl ? (
                            <div className="w-14 h-14 rounded-lg overflow-hidden border border-white/10 bg-[#0A0F1C]/50 flex items-center justify-center shrink-0">
                                <img
                                    src={attachmentPreviewUrl}
                                    alt={attachmentFile.name}
                                    className="block max-w-full max-h-full w-auto h-auto object-contain"
                                    loading="eager"
                                    decoding="async"
                                />
                            </div>
                        ) : null}
                        <span className="text-xs text-[#E6C673] truncate max-w-[180px]">{attachmentFile.name}</span>
                    </div>
                ) : null}
                <button
                    type="button"
                    onClick={onTogglePinned}
                    className={`${REPO_TOUCH_CHIP} px-3 rounded-xl text-xs border ${isPinned ? 'border-[#E6C673]/40 text-[#E6C673]' : 'border-white/10 text-white/50'}`}
                >
                    تثبيت
                </button>
            </div>
            <div className="flex gap-2">
                <button
                    type="button"
                    disabled={saving}
                    onClick={onSave}
                    className={REPO_BTN_GOLD}
                    data-testid="repository-note-save"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    حفظ البطاقة
                </button>
                <button type="button" onClick={onCancel} className="inline-flex items-center min-h-[44px] px-4 text-sm text-white/55 touch-manipulation">
                    إلغاء
                </button>
            </div>
        </div>
    );
});

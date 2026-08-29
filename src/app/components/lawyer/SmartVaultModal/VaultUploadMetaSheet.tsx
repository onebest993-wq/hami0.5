import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { Upload } from '@/app/components/ui/icons/Upload';
import { FileText } from '@/app/components/ui/icons/FileText';
import { Loader2 } from '@/app/components/ui/icons/Loader2';
import { ImageIcon } from '@/app/components/ui/icons/ImageIcon';
import { formatFileSize } from '@/app/components/lawyer/hooks/useSmartVault';
import type { VaultUploadKind } from '@/app/services/vaultUploadService';
import { revokeBlobUrlIfNeeded } from '@/app/services/vault/vaultDocUtils';
import { VaultCategoryPicker } from '@/app/components/lawyer/SmartVaultModal/VaultCategoryPicker';
import {
    VAULT_SHEET,
    VAULT_SHEET_OVERLAY,
    VAULT_SHEET_OVERLAY_VIEWPORT,
    VAULT_INPUT,
    VAULT_LABEL,
    VAULT_BTN_SAVE,
    VAULT_BTN_CANCEL,
} from './vaultDustyRoseTheme';

export type VaultUploadMeta = {
    title: string;
    lawyerNote: string;
    classification: string;
};

interface VaultUploadMetaSheetProps {
    file: File;
    uploadKind: VaultUploadKind;
    previewUrl?: string;
    queueRemaining: number;
    isSaving: boolean;
    categorySuggestions: string[];
    onAddCategory: (name: string) => void;
    onConfirm: (meta: VaultUploadMeta) => void;
    onCancel: () => void;
    overlayScope?: 'panel' | 'viewport';
}

function suggestTitle(fileName: string): string {
    return fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

const VAULT_UPLOAD_PREVIEW_IMAGE =
    'block mx-auto max-w-full max-h-[min(40vh,260px)] w-auto h-auto object-contain';

export const VaultUploadMetaSheet: React.FC<VaultUploadMetaSheetProps> = ({
    file,
    uploadKind,
    previewUrl,
    queueRemaining,
    isSaving,
    categorySuggestions,
    onAddCategory,
    onConfirm,
    onCancel,
    overlayScope = 'panel',
}) => {
    const [title, setTitle] = useState(() => suggestTitle(file.name));
    const [lawyerNote, setLawyerNote] = useState('');
    const [classification, setClassification] = useState('');

    const isImageUpload = uploadKind === 'image';
    const isPdf = uploadKind === 'pdf';
    const overlayClass = overlayScope === 'viewport' ? VAULT_SHEET_OVERLAY_VIEWPORT : VAULT_SHEET_OVERLAY;

    const localPreviewUrl = useMemo(() => {
        if (!isImageUpload) return undefined;
        try {
            return URL.createObjectURL(file);
        } catch {
            return undefined;
        }
    }, [file, isImageUpload]);

    useEffect(() => {
        return () => revokeBlobUrlIfNeeded(localPreviewUrl);
    }, [localPreviewUrl]);

    useEffect(() => {
        setTitle(suggestTitle(file.name));
        setLawyerNote('');
        setClassification('');
    }, [file]);

    const displayPreviewUrl = previewUrl ?? localPreviewUrl;

    const sheet = (
        <div
            className={overlayClass}
            dir="rtl"
            onClick={isSaving ? undefined : onCancel}
            data-testid="vault-upload-meta-overlay"
        >
            <div className={VAULT_SHEET} onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F7F3EB]/15 to-transparent" />
                <div className="px-5 py-4 border-b border-[#C9A9A6]/12 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-[#F7F3EB] font-bold text-base">
                            {isPdf ? 'تجهيز ملف PDF قبل الرفع' : 'تجهيز الصورة قبل الرفع'}
                        </h3>
                        <p className="text-[#C9A9A6]/50 text-[10px] mt-0.5">
                            {queueRemaining > 0 ? `باقي ${queueRemaining} ملف بعد هذا` : 'ملف واحد'}
                            {isImageUpload && file.size > 0 ? ` · ${formatFileSize(file.size)}` : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        aria-label="إغلاق"
                        data-testid="vault-upload-cancel-icon"
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg hover:bg-[#4A4440]/40 touch-manipulation"
                    >
                        <X size={18} className="text-[#C9A9A6]/60" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 min-h-0 pb-6">
                    {isImageUpload ? (
                        displayPreviewUrl ? (
                            <div
                                className="rounded-xl overflow-hidden bg-[#2E2A27] border border-[#C9A9A6]/15 min-h-[160px] max-h-[min(40vh,260px)] flex items-center justify-center p-2 shrink-0"
                                data-testid="vault-upload-image-preview"
                            >
                                <img
                                    src={displayPreviewUrl}
                                    alt={file.name || 'معاينة الصورة'}
                                    className={VAULT_UPLOAD_PREVIEW_IMAGE}
                                    loading="eager"
                                    decoding="sync"
                                />
                            </div>
                        ) : (
                            <div className="rounded-xl bg-[#4A4440]/35 border border-[#C9A9A6]/15 p-3 flex items-center gap-2 shrink-0">
                                <ImageIcon size={22} className="text-[#C9A9A6]/70 shrink-0" />
                                <span className="text-[#C9A9A6]/55 text-xs truncate">{file.name}</span>
                            </div>
                        )
                    ) : null}

                    {isPdf ? (
                        <div className="rounded-2xl border-2 border-[#B8A078]/25 bg-[#B8A078]/8 p-4 flex items-center gap-3 shrink-0">
                            <div className="w-12 h-12 rounded-xl bg-[#4A4440]/50 border border-[#B8A078]/20 flex items-center justify-center shrink-0">
                                <FileText size={26} className="text-[#B8A078]" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[#F7F3EB] font-bold text-sm truncate">{file.name}</p>
                                <p className="text-[#C9A9A6]/50 text-[10px]">{formatFileSize(file.size)} · PDF</p>
                            </div>
                        </div>
                    ) : null}

                    <div>
                        <label className={VAULT_LABEL}>
                            {isPdf ? 'عنوان ملف PDF *' : 'اسم/عنوان الصورة *'}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={isPdf ? 'مثال: عقد البيع — موكل أحمد' : 'مثال: صورة الهوية — موكل أحمد'}
                            className={VAULT_INPUT}
                            data-testid="vault-upload-title"
                        />
                    </div>

                    <div>
                        <label className={VAULT_LABEL}>وصف / تذكير للمحامي</label>
                        <textarea
                            value={lawyerNote}
                            onChange={(e) => setLawyerNote(e.target.value)}
                            placeholder={isPdf ? 'ملخص محتوى الملف أو الغرض منه...' : 'لمن هذه الصورة؟ ما الغرض منها؟'}
                            rows={3}
                            className={`${VAULT_INPUT} resize-none`}
                        />
                    </div>

                    <div className={isPdf ? 'rounded-xl border border-[#C9A9A6]/15 bg-[#C9A9A6]/5 p-3' : ''}>
                        <label className={VAULT_LABEL}>
                            {isPdf ? 'تصنيف PDF' : 'تصنيف'}{' '}
                            <span className="text-[#C9A9A6]/40 font-normal">(اختياري)</span>
                        </label>
                        <VaultCategoryPicker
                            id={isPdf ? 'vault-upload-pdf-category' : 'vault-upload-image-category'}
                            categories={categorySuggestions}
                            value={classification}
                            onChange={setClassification}
                            onAddCategory={onAddCategory}
                            disabled={isSaving}
                        />
                    </div>
                </div>

                <div className="px-5 py-4 border-t border-[#C9A9A6]/10 flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className={VAULT_BTN_CANCEL}
                        data-testid="vault-upload-cancel"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        disabled={isSaving || !title.trim()}
                        onClick={() =>
                            onConfirm({
                                title: title.trim(),
                                lawyerNote: lawyerNote.trim(),
                                classification: classification.trim(),
                            })
                        }
                        className={VAULT_BTN_SAVE}
                        data-testid="vault-upload-confirm"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {isSaving ? 'جاري الرفع...' : 'رفع وحفظ'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (overlayScope === 'viewport' && typeof document !== 'undefined') {
        return createPortal(sheet, document.body);
    }
    return sheet;
};

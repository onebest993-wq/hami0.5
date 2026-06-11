import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Upload, FileText, Loader2, ImageIcon } from 'lucide-react';
import { isVaultImageFile } from '@/app/services/vaultUploadService';
import type { VaultUploadKind } from '@/app/services/vaultUploadService';
import { formatFileSize } from '@/app/components/lawyer/hooks/useSmartVault';
import { VaultCategoryPicker } from '@/app/components/lawyer/SmartVaultModal/VaultCategoryPicker';

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
}

function suggestTitle(fileName: string): string {
    return fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim();
}

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
}) => {
    const [title, setTitle] = useState('');
    const [lawyerNote, setLawyerNote] = useState('');
    const [classification, setClassification] = useState('');

    useEffect(() => {
        setTitle(suggestTitle(file.name));
        setLawyerNote('');
        setClassification('');
    }, [file]);

    const isImage = uploadKind === 'image' && isVaultImageFile(file);
    const isPdf = uploadKind === 'pdf';

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[50] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
            dir="rtl"
            onClick={isSaving ? undefined : onCancel}
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full sm:max-w-md bg-[#1A1E2E] border border-[#D4AF37]/25 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-white font-bold text-base">
                            {isPdf ? 'تجهيز ملف PDF قبل الرفع' : 'تجهيز الصورة قبل الرفع'}
                        </h3>
                        <p className="text-white/35 text-[10px] mt-0.5">
                            {queueRemaining > 0 ? `باقي ${queueRemaining} ملف بعد هذا` : 'ملف واحد'}
                        </p>
                    </div>
                    <button type="button" onClick={onCancel} disabled={isSaving} className="p-2 rounded-lg hover:bg-white/5">
                        <X size={18} className="text-white/50" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    {isImage && previewUrl ? (
                        <div className="rounded-xl overflow-hidden bg-black/40 border border-white/10 h-36">
                            <img src={previewUrl} alt="معاينة" className="w-full h-full object-contain" />
                        </div>
                    ) : null}

                    {isPdf ? (
                        <div className="rounded-2xl border-2 border-[#D4AF37]/35 bg-[#D4AF37]/8 p-4 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-400/25 flex items-center justify-center shrink-0">
                                <FileText size={26} className="text-red-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-white font-bold text-sm truncate">{file.name}</p>
                                <p className="text-white/40 text-[10px]">{formatFileSize(file.size)} · PDF</p>
                            </div>
                        </div>
                    ) : null}

                    {!isPdf && !previewUrl && isImage ? (
                        <div className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
                            <ImageIcon size={22} className="text-[#D4AF37]/70" />
                            <span className="text-white/50 text-xs truncate">{file.name}</span>
                        </div>
                    ) : null}

                    <div>
                        <label className="text-white/60 text-xs font-bold mb-1 block">
                            {isPdf ? 'عنوان ملف PDF *' : 'اسم/عنوان الصورة *'}
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder={isPdf ? 'مثال: عقد البيع — موكل أحمد' : 'مثال: صورة الهوية — موكل أحمد'}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                        />
                    </div>

                    <div>
                        <label className="text-white/60 text-xs font-bold mb-1 block">وصف / تذكير للمحامي</label>
                        <textarea
                            value={lawyerNote}
                            onChange={(e) => setLawyerNote(e.target.value)}
                            placeholder={isPdf ? 'ملخص محتوى الملف أو الغرض منه...' : 'لمن هذه الصورة؟ ما الغرض منها؟'}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40 resize-none"
                        />
                    </div>

                    <div className={isPdf ? 'rounded-xl border border-[#D4AF37]/25 bg-[#D4AF37]/5 p-3' : ''}>
                        <label className="text-white/60 text-xs font-bold mb-1 block">
                            {isPdf ? 'تصنيف PDF' : 'تصنيف'}{' '}
                            <span className="text-white/30 font-normal">(اختياري)</span>
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

                <div className="px-5 py-4 border-t border-white/5 flex gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSaving}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/70 text-sm font-bold hover:bg-white/10 disabled:opacity-50"
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
                        className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-bold hover:bg-[#C4A030] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                        {isSaving ? 'جاري الرفع...' : 'رفع وحفظ'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

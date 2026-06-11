import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Loader2 } from 'lucide-react';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { VaultCategoryPicker } from '@/app/components/lawyer/SmartVaultModal/VaultCategoryPicker';

export type VaultDocEditValues = {
    title: string;
    lawyerNote: string;
    classification: string;
};

interface VaultDocEditSheetProps {
    doc: SmartVaultDoc;
    isSaving: boolean;
    categorySuggestions: string[];
    onAddCategory: (name: string) => void;
    onSave: (values: VaultDocEditValues) => void;
    onClose: () => void;
}

export const VaultDocEditSheet: React.FC<VaultDocEditSheetProps> = ({
    doc,
    isSaving,
    categorySuggestions,
    onAddCategory,
    onSave,
    onClose,
}) => {
    const [title, setTitle] = useState(doc.title);
    const [lawyerNote, setLawyerNote] = useState(doc.lawyerNote ?? '');
    const [classification, setClassification] = useState(doc.customCategory ?? '');

    useEffect(() => {
        setTitle(doc.title);
        setLawyerNote(doc.lawyerNote ?? '');
        setClassification(doc.customCategory ?? '');
    }, [doc]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[50] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
            dir="rtl"
            onClick={isSaving ? undefined : onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full sm:max-w-md bg-[#1A1E2E] border border-[#D4AF37]/25 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                    <h3 className="text-white font-bold text-base">تعديل الملف</h3>
                    <button type="button" onClick={onClose} disabled={isSaving} className="p-2 rounded-lg hover:bg-white/5">
                        <X size={18} className="text-white/50" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    <div>
                        <label className="text-white/60 text-xs font-bold mb-1 block">العنوان</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40"
                        />
                    </div>
                    <div>
                        <label className="text-white/60 text-xs font-bold mb-1 block">الوصف / التذكير</label>
                        <textarea
                            value={lawyerNote}
                            onChange={(e) => setLawyerNote(e.target.value)}
                            rows={3}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-[#D4AF37]/40 resize-none"
                        />
                    </div>
                    <div>
                        <label className="text-white/60 text-xs font-bold mb-1 block">
                            تصنيف <span className="text-white/30 font-normal">(اختياري)</span>
                        </label>
                        <VaultCategoryPicker
                            id="vault-edit-category"
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
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 py-2.5 rounded-xl bg-white/5 text-white/70 text-sm font-bold"
                    >
                        إلغاء
                    </button>
                    <button
                        type="button"
                        disabled={isSaving || !title.trim()}
                        onClick={() =>
                            onSave({
                                title: title.trim(),
                                lawyerNote: lawyerNote.trim(),
                                classification: classification.trim(),
                            })
                        }
                        className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        حفظ
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

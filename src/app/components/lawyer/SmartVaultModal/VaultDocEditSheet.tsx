import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Loader2 } from 'lucide-react';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import { VaultCategoryPicker } from '@/app/components/lawyer/SmartVaultModal/VaultCategoryPicker';
import {
    VAULT_SHEET,
    VAULT_SHEET_OVERLAY,
    VAULT_INPUT,
    VAULT_LABEL,
    VAULT_BTN_SAVE,
    VAULT_BTN_CANCEL,
} from './vaultDustyRoseTheme';

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
            className={VAULT_SHEET_OVERLAY}
            dir="rtl"
            onClick={isSaving ? undefined : onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                className={VAULT_SHEET}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#F7F3EB]/15 to-transparent" />
                <div className="px-5 py-4 border-b border-[#C9A9A6]/12 flex items-center justify-between shrink-0">
                    <h3 className="text-[#F7F3EB] font-bold text-base">تعديل الملف</h3>
                    <button type="button" onClick={onClose} disabled={isSaving} className="p-2 rounded-lg hover:bg-[#4A4440]/40">
                        <X size={18} className="text-[#C9A9A6]/60" />
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 min-h-0">
                    <div>
                        <label className={VAULT_LABEL}>العنوان</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={VAULT_INPUT} />
                    </div>
                    <div>
                        <label className={VAULT_LABEL}>الوصف / التذكير</label>
                        <textarea
                            value={lawyerNote}
                            onChange={(e) => setLawyerNote(e.target.value)}
                            rows={3}
                            className={`${VAULT_INPUT} resize-none`}
                        />
                    </div>
                    <div>
                        <label className={VAULT_LABEL}>
                            تصنيف <span className="text-[#C9A9A6]/40 font-normal">(اختياري)</span>
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

                <div className="px-5 py-4 border-t border-[#C9A9A6]/10 flex gap-2 shrink-0">
                    <button type="button" onClick={onClose} disabled={isSaving} className={VAULT_BTN_CANCEL}>
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
                        className={VAULT_BTN_SAVE}
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        حفظ
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

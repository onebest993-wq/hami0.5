import React, { useState } from 'react';
import { motion, AnimatePresence } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import { DatePickerField } from '@/app/components/lawyer/Dashboard_Active_Order_File/components/DatePickerField';
import {
    URGENT_DOSSIER_BTN_PRIMARY,
    URGENT_DOSSIER_INPUT,
} from '@/app/components/lawyer/Dashboard_Active_Order_File/layout/urgentDossierUi';

type ActionType = 'notification' | 'grievance' | 'cassation';
type GrievanceResult = 'affirmed' | 'modified' | 'cancelled' | '';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    actionType: ActionType;
    caseName: string;
    /** ISO yyyy-MM-dd — earliest allowed action date (chronology guard) */
    minActionDate?: string;
    onSubmit: (data: {
        actionDate: string;
        result?: GrievanceResult;
        notes?: string;
    }) => void;
}

export const Modal_Quick_Log: React.FC<Props> = ({
    isOpen,
    onClose,
    actionType,
    caseName,
    minActionDate,
    onSubmit,
}) => {
    const [actionDate, setActionDate] = useState<string>('');
    const [result, setResult] = useState<GrievanceResult>('');
    const [notes, setNotes] = useState<string>('');

    const getModalConfig = () => {
        switch (actionType) {
            case 'notification':
                return {
                    title: 'تأكيد التبليغ',
                    description: 'تسجيل تاريخ التبليغ بقرار القاضي',
                    actionLabel: 'تأكيد التبليغ',
                    needsResult: false,
                };
            case 'grievance':
                return {
                    title: 'تسجيل التظلم',
                    description: 'تسجيل تقديم التظلم ونتيجته',
                    actionLabel: 'حفظ التظلم',
                    needsResult: true,
                };
            case 'cassation':
                return {
                    title: 'تسجيل الطعن التمييزي',
                    description: 'تسجيل تقديم الطعن التمييزي',
                    actionLabel: 'حفظ التمييز',
                    needsResult: false,
                };
        }
    };

    const config = getModalConfig();
    const minYmd =
        typeof minActionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(minActionDate) ? minActionDate : '';
    const actionDateValid = !!actionDate && (!minYmd || actionDate >= minYmd);

    const handleSubmit = () => {
        if (!actionDate || !actionDateValid) return;

        onSubmit({
            actionDate,
            result: config.needsResult ? result : undefined,
            notes: notes.trim() || undefined,
        });

        setActionDate('');
        setResult('');
        setNotes('');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-0 sm:px-4 font-['Tajawal']">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="w-full sm:max-w-lg bg-[#0B1021] border border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/[0.08]">
                        <div className="min-w-0">
                            <h2 className="text-white font-extrabold text-sm">{config.title}</h2>
                            <p className="text-white/45 text-xs mt-0.5">{config.description}</p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-9 h-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white shrink-0 touch-manipulation"
                            aria-label="إغلاق"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className="px-4 py-3 border-b border-white/[0.06]">
                        <div className="text-[10px] font-semibold text-white/40">الطلب</div>
                        <div className="text-white font-bold text-sm mt-0.5 truncate">{caseName}</div>
                    </div>

                    <div className="p-4 space-y-3 max-h-[55vh] overflow-y-auto">
                        <div>
                            <label className="text-[10px] font-semibold text-white/40 mb-1 block">
                                تاريخ الإجراء <span className="text-red-400">*</span>
                            </label>
                            <DatePickerField
                                value={actionDate}
                                onValueChange={setActionDate}
                                min={minYmd || undefined}
                                wrapperClassName="w-full max-w-[304px]"
                                inputClassName={URGENT_DOSSIER_INPUT}
                            />
                        </div>

                        {config.needsResult && (
                            <div>
                                <label className="text-[10px] font-semibold text-white/40 mb-2 block">
                                    نتيجة التظلم <span className="text-red-400">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { value: 'affirmed', label: 'تأييد' },
                                        { value: 'modified', label: 'تعديل' },
                                        { value: 'cancelled', label: 'إلغاء' },
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setResult(option.value as GrievanceResult)}
                                            className={`min-h-[40px] px-2 py-2 rounded-lg border text-xs font-bold transition-colors touch-manipulation ${
                                                result === option.value
                                                    ? 'border-[#E6C673]/40 bg-[#E6C673]/15 text-[#F5F0E6]'
                                                    : 'border-white/10 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]'
                                            }`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="text-[10px] font-semibold text-white/40 mb-1 block">
                                ملاحظات (اختياري)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className={`${URGENT_DOSSIER_INPUT} resize-none py-2`}
                            />
                        </div>
                    </div>

                    <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold text-sm touch-manipulation"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!actionDate || !actionDateValid || (config.needsResult && !result)}
                            className={`${URGENT_DOSSIER_BTN_PRIMARY} min-h-[40px] py-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {config.actionLabel}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

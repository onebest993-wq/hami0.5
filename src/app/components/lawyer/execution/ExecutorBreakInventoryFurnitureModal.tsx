/**
 * إكمال جرد المنقولات لطلب كسر الأقفال والجرد — قائمة أو إقرار عدم وجود أثاث.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X } from 'lucide-react';
import type { BreakInventoryFurnitureSavePayload } from '@/app/utils/executorApprovalWorkflow';
import { EXEC_MODAL_Z } from '@/app/components/lawyer/execution/executionModalStack';

export interface ExecutorBreakInventoryFurnitureModalProps {
    open: boolean;
    requestTitle: string;
    onClose: () => void;
    onConfirm: (payload: BreakInventoryFurnitureSavePayload) => void;
    onFinalize: () => void;
}

export const ExecutorBreakInventoryFurnitureModal: React.FC<ExecutorBreakInventoryFurnitureModalProps> = ({
    open,
    requestTitle,
    onClose,
    onConfirm,
    onFinalize,
}) => {
    const [mode, setMode] = useState<'list' | 'none'>('list');
    const [linesText, setLinesText] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (open) {
            setMode('list');
            setLinesText('');
            setSaved(false);
        }
    }, [open]);

    if (!open) return null;

    const handleSave = () => {
        if (mode === 'none') {
            onConfirm({ mode: 'none', lines: [] });
            setSaved(true);
            return;
        }
        const lines = linesText
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        if (lines.length === 0) return;
        onConfirm({ mode: 'list', lines });
        setSaved(true);
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xl flex items-center justify-center p-4"
            style={{ zIndex: EXEC_MODAL_Z.nestedOverDecisions }}
        >
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="backdrop-blur-3xl bg-slate-900/40 border border-indigo-500/20 rounded-3xl p-6 max-w-lg w-full shadow-2xl shadow-indigo-500/10"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
                        جرد المنقولات
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-lg"
                    >
                        <X size={24} />
                    </button>
                </div>
                <p className="text-gray-400 text-xs text-right mb-4 leading-relaxed">{requestTitle}</p>

                <div className="space-y-3 text-right">
                    <label className="flex flex-row-reverse items-center gap-2 cursor-pointer text-sm text-slate-200">
                        <input
                            type="radio"
                            name="inv-mode"
                            checked={mode === 'list'}
                            onChange={() => setMode('list')}
                            className="accent-indigo-500"
                        />
                        <span>إدراج المنقولات المجرودة (سطر لكل بند)</span>
                    </label>
                    <label className="flex flex-row-reverse items-center gap-2 cursor-pointer text-sm text-slate-200">
                        <input
                            type="radio"
                            name="inv-mode"
                            checked={mode === 'none'}
                            onChange={() => setMode('none')}
                            className="accent-indigo-500"
                        />
                        <span>لا يوجد أثاث في العين وقت الجرد</span>
                    </label>

                    {mode === 'list' ? (
                        <textarea
                            value={linesText}
                            onChange={(e) => setLinesText(e.target.value)}
                            rows={8}
                            placeholder="مثال: ثلاجة — طاولة طعام — …"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-white text-right resize-y min-h-[140px] focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
                        />
                    ) : null}
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-2 mt-6 justify-end">
                    {saved ? (
                        <button
                            type="button"
                            onClick={() => {
                                onFinalize();
                                onClose();
                            }}
                            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-bold shadow-lg shadow-emerald-900/30"
                        >
                            تم الإنهاء
                        </button>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2.5 rounded-xl border border-white/15 text-slate-300 text-sm font-bold hover:bg-white/5"
                            >
                                إلغاء
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={mode === 'list' && !linesText.split(/\r?\n/).some((s) => /\S/.test(s))}
                                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                حفظ في الملاحظات
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

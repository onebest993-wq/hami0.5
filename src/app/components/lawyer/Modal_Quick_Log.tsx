import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

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
    onSubmit
}) => {
    const [actionDate, setActionDate] = useState<string>('');
    const [result, setResult] = useState<GrievanceResult>('');
    const [notes, setNotes] = useState<string>('');

    const getModalConfig = () => {
        switch (actionType) {
            case 'notification':
                return {
                    title: 'تأكيد التبليغ الأصولي',
                    icon: <CheckCircle2 className="text-green-400" size={24} />,
                    gradient: 'from-green-900/50 to-emerald-800/30',
                    description: 'تسجيل تأكيد وصول التبليغ القانوني للخصم',
                    actionLabel: 'تأكيد التبليغ',
                    needsResult: false
                };
            case 'grievance':
                return {
                    title: 'تسجيل التظلم (3 أيام)',
                    icon: <FileText className="text-amber-400" size={24} />,
                    gradient: 'from-amber-900/50 to-orange-800/30',
                    description: 'تسجيل تقديم التظلم ونتيجته أمام نفس القاضي',
                    actionLabel: 'حفظ التظلم',
                    needsResult: true
                };
            case 'cassation':
                return {
                    title: 'تسجيل الطعن التمييزي (7 أيام)',
                    icon: <FileText className="text-red-400" size={24} />,
                    gradient: 'from-red-900/50 to-rose-800/30',
                    description: 'تسجيل تقديم الطعن التمييزي أمام محكمة التمييز',
                    actionLabel: 'حفظ التمييز',
                    needsResult: false
                };
        }
    };

    const config = getModalConfig();

    const minYmd = typeof minActionDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(minActionDate) ? minActionDate : '';
    const actionDateValid = !!actionDate && (!minYmd || actionDate >= minYmd);

    const handleSubmit = () => {
        if (!actionDate || !actionDateValid) return;

        onSubmit({
            actionDate,
            result: config.needsResult ? result : undefined,
            notes: notes.trim() || undefined
        });

        // Reset form
        setActionDate('');
        setResult('');
        setNotes('');
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-['Tajawal']">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-lg bg-[#1A1E2E] rounded-2xl shadow-2xl overflow-hidden border border-white/10"
                >
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${config.gradient} p-6 border-b border-white/10 relative`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                        >
                            <X size={16} className="text-white" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                                {config.icon}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-white font-bold text-lg">{config.title}</h2>
                                <p className="text-white/60 text-xs mt-1">{config.description}</p>
                            </div>
                        </div>

                        {/* Case Name */}
                        <div className="mt-4 bg-black/30 rounded-lg p-3 border border-white/10">
                            <div className="text-white/50 text-xs mb-1">الدعوى / الطلب</div>
                            <div className="text-white font-bold text-sm">{caseName}</div>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                        {/* Action Date */}
                        <div>
                            <label className="text-white/80 text-sm font-bold mb-2 block flex items-center gap-2">
                                <Calendar size={14} />
                                تاريخ الإجراء
                                <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="date"
                                lang="ar-IQ"
                                value={actionDate}
                                min={minYmd || undefined}
                                onChange={(e) => setActionDate(e.target.value)}
                                className="w-full bg-[#2A3241] border border-white/15 rounded-lg px-4 py-3 text-white focus:border-[#E6C673] outline-none text-sm"
                                dir="ltr"
                            />
                        </div>

                        {/* Result (Only for Grievance) */}
                        {config.needsResult && (
                            <div>
                                <label className="text-white/80 text-sm font-bold mb-2 block flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    نتيجة التظلم
                                    <span className="text-red-400">*</span>
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'affirmed', label: 'تأييد', desc: 'رفض التظلم', color: 'red' },
                                        { value: 'modified', label: 'تعديل', desc: 'تعديل جزئي', color: 'amber' },
                                        { value: 'cancelled', label: 'إلغاء', desc: 'إلغاء الأمر', color: 'green' }
                                    ].map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setResult(option.value as GrievanceResult)}
                                            className={`p-3 rounded-lg border-2 transition-all text-xs ${
                                                result === option.value
                                                    ? option.color === 'red'
                                                        ? 'border-red-500 bg-red-500/20 text-red-300'
                                                        : option.color === 'amber'
                                                        ? 'border-amber-500 bg-amber-500/20 text-amber-300'
                                                        : 'border-green-500 bg-green-500/20 text-green-300'
                                                    : 'border-white/10 bg-white/5 text-white/50 hover:border-white/30'
                                            }`}
                                        >
                                            <div className="font-bold mb-1">{option.label}</div>
                                            <div className="text-[9px] opacity-70">{option.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Notes (Optional) */}
                        <div>
                            <label className="text-white/80 text-sm font-bold mb-2 block flex items-center gap-2">
                                <FileText size={14} />
                                ملاحظات إضافية (اختياري)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="أي تفاصيل أو ملاحظات إضافية..."
                                rows={3}
                                className="w-full bg-[#2A3241] border border-white/15 rounded-lg px-4 py-3 text-white focus:border-[#E6C673] outline-none text-sm resize-none"
                            />
                        </div>

                        {/* Validation Warning */}
                        {(!actionDate || !actionDateValid || (config.needsResult && !result)) && (
                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="text-amber-400 mt-0.5" size={14} />
                                    <div className="text-amber-300 text-xs">
                                        <div className="font-bold mb-1">الحقول المطلوبة:</div>
                                        <ul className="space-y-1 mr-4">
                                            {!actionDate && <li>• تاريخ الإجراء</li>}
                                            {!!actionDate && !actionDateValid && minYmd && (
                                                <li>• تاريخ الإجراء يجب أن يكون بعد {minYmd} (ترتيب زمني)</li>
                                            )}
                                            {config.needsResult && !result && <li>• نتيجة التظلم</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 bg-black/30 border-t border-white/10 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-3 rounded-lg bg-transparent text-white/60 hover:text-white hover:bg-white/5 transition-colors font-bold"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!actionDate || !actionDateValid || (config.needsResult && !result)}
                            className="px-5 py-3 rounded-lg bg-gradient-to-r from-[#E6C673] to-[#D4AF37] text-[#0B1021] font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={16} />
                            <span>{config.actionLabel}</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

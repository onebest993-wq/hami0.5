import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle, Edit3 } from 'lucide-react';

interface MaterialErrorCorrectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { errorDetails: string; correctionType: string }) => void;
    correctionType: string;
}

// Material Error Correction Modal
export const MaterialErrorCorrectionModal = ({ isOpen, onClose, onConfirm, correctionType }: MaterialErrorCorrectionModalProps) => {
    const [errorDetails, setErrorDetails] = useState('');

    const handleSubmit = () => {
        if (!errorDetails) return;
        onConfirm({ correctionType, errorDetails });
        onClose();
    };

    if (!isOpen) return null;

    const isAmbiguity = correctionType === 'clarification';
    const title = isAmbiguity ? 'طلب توضيح حكم غامض' : 'طلب تصحيح خطأ مادي في الحكم';
    const icon = isAmbiguity ? <AlertTriangle size={18} /> : <Edit3 size={18} />;
    const color = isAmbiguity ? 'blue' : 'amber';

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']" dir="rtl">
            <div className={`bg-[#1A1E2E] border border-${color}-500/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl shadow-${color}-900/40`}>
                <div className={`bg-gradient-to-r from-${color}-600 to-${color}-700 p-4 text-white flex justify-between items-center`}>
                    <h3 className="font-bold text-sm flex items-center gap-2">
                        {icon}
                        {title}
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className={`bg-${color}-500/10 border border-${color}-500/30 rounded-lg p-3 text-${color}-200 text-xs`}>
                        {isAmbiguity ? (
                            <span>📌 طلب توضيح الحكم عند وجود غموض أو تناقض في المنطوق</span>
                        ) : (
                            <span>📌 تصحيح الخطأ المادي لا يمس جوهر الحكم (أخطاء حسابية، كتابية، وقائع مثبتة...)</span>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-white/60 mb-1.5">
                            {isAmbiguity ? 'وصف الغموض المطلوب توضيحه' : 'وصف الخطأ المادي المطلوب تصحيحه'} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={errorDetails}
                            onChange={(e) => setErrorDetails(e.target.value)}
                            placeholder={isAmbiguity 
                                ? "مثال: وجود تناقض في منطوق الحكم بخصوص..."
                                : "مثال: خطأ في حساب المبلغ المحكوم به، خطأ في اسم أحد الأطراف..."
                            }
                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-amber-500 min-h-[120px]"
                        />
                    </div>

                    <button type="button"
                        onClick={handleSubmit}
                        disabled={!errorDetails}
                        className={`w-full bg-gradient-to-r from-${color}-600 to-${color}-700 text-white py-3 rounded-lg font-bold text-sm hover:from-${color}-500 hover:to-${color}-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2`}
                    >
                        {icon}
                        {isAmbiguity ? 'تقديم طلب التوضيح' : 'تقديم طلب التصحيح'}
                    </button>
                </div>
            </div>
        </div>
    );
};

import React from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import type { ResumeInterruptionModalProps } from '../../smartFile/modalFormTypes';
import { useSmartFileModalTheme } from '../../smartFile/smartFileModalTheme';

export const ResumeInterruptionModal = ({ isOpen, onClose, onConfirm }: ResumeInterruptionModalProps) => {
    const T = useSmartFileModalTheme();

    if (!isOpen) return null;

    if (T.variant === 'personal-pearl') {
        return (
            <MoroccanGlassShell onOverlayClick={onClose} maxWidth="max-w-sm">
                <div className={T.header}>
                    <h3 className={T.headerTitle}>
                        <RotateCcw size={17} className={T.headerIcon} strokeWidth={1.75} />
                        استئناف السير في الدعوى
                    </h3>
                    <button type="button" onClick={onClose} className={T.closeBtn} aria-label="إغلاق">
                        <X size={16} />
                    </button>
                </div>
                <div className={`${T.body} text-center space-y-4`}>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto border border-[#F0A8B4]/24 bg-gradient-to-br from-[#F5C6D0]/[0.15] to-white/[0.05]">
                        <Check size={28} className="text-[#FFD4DC]" strokeWidth={1.75} />
                    </div>
                    <h4 className="text-[#FFFEF9] font-bold text-[15px]">هل تم زوال السبب؟</h4>
                    <p className="text-[#9894A0] text-[12px] leading-relaxed">
                        هل أنت متأكد من زوال سبب انقطاع السير (مثل تبليغ الورثة أو تعيين ممثل قانوني) والرغبة في استئناف الدعوى؟
                    </p>
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="py-2.5 rounded-xl font-bold text-sm border border-white/[0.14] bg-white/[0.05] text-[#9894A0] hover:bg-white/[0.08] hover:text-[#ECE8E2] transition-all"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={T.btn}
                        >
                            نعم، استئناف السير
                        </button>
                    </div>
                </div>
            </MoroccanGlassShell>
        );
    }

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white flex justify-between items-center">
                    <h3 className="font-bold flex items-center gap-2">
                        <RotateCcw size={18} />
                        استئناف السير في الدعوى
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full p-1">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4 text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Check size={32} className="text-green-500" />
                    </div>

                    <h4 className="text-white font-bold text-lg">هل تم زوال السبب؟</h4>
                    <p className="text-white/60 text-sm leading-relaxed">
                        هل أنت متأكد من زوال سبب انقطاع السير (مثل تبليغ الورثة أو تعيين ممثل قانوني) والرغبة في استئناف الدعوى؟
                    </p>

                    <div className="grid grid-cols-2 gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full bg-[#0F172A] text-white/70 py-3 rounded-lg font-bold text-sm hover:bg-white/5 transition-all border border-white/10"
                        >
                            إلغاء
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-bold text-sm hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg shadow-green-500/20"
                        >
                            نعم، استئناف السير
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

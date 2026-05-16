import React from 'react';
import { FlaskConical, X } from 'lucide-react';

export interface CaseHeaderProps {
    step: 'gateway' | 'selection' | 'form';
    isExpertMode: boolean;
    onToggleExpert: () => void;
    onTriggerDemo: () => void;
    onClose: () => void;
}

export const CaseHeader = ({ step, isExpertMode, onToggleExpert, onTriggerDemo, onClose }: CaseHeaderProps) => {
    return (
        <div className="h-14 bg-[#1A1E2E] border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-50">
            <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors"><X size={20} /></button>
            <h2 className="text-sm font-bold text-white">
                {step === 'form' ? 'إضبارة الدعوى المدنية' : 'اختر التصنيف القضائي'}
            </h2>

            <div className="flex items-center justify-end gap-3">
                {step === 'form' && (
                    <>
                        <div
                            className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 cursor-pointer hover:bg-black/60 transition-all group"
                            onClick={onToggleExpert}
                        >
                            <span className={`text-[10px] font-bold transition-colors ${isExpertMode ? 'text-[#E6C673]' : 'text-slate-400 group-hover:text-slate-300'}`}>
                                {isExpertMode ? 'الرقيب' : 'الخبير'}
                            </span>
                            <div className={`relative w-8 h-4 rounded-full transition-all duration-300 flex items-center ${isExpertMode ? 'bg-[#E6C673] shadow-[0_0_8px_rgba(230,198,115,0.4)]' : 'bg-slate-700'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${isExpertMode ? 'right-0.5' : 'left-0.5'}`} />
                            </div>
                        </div>
                        <button type="button"
                            onClick={onTriggerDemo}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-[#E6C673] hover:bg-[#E6C673] hover:text-[#0F172A] transition-all"
                            title="تعبئة بيانات تجريبية (Demo Mode)"
                        >
                            <FlaskConical size={16} />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

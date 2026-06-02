import React from 'react';
import { FlaskConical, X } from 'lucide-react';

export interface CaseHeaderProps {
    step: 'gateway' | 'selection' | 'form';
    onTriggerDemo: () => void;
    onClose: () => void;
}

export const CaseHeader = ({ step, onTriggerDemo, onClose }: CaseHeaderProps) => {
    return (
        <div className="h-14 bg-[#1A1E2E] border-b border-white/5 flex items-center justify-between px-4 shrink-0 z-50">
            <button type="button" onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-white/60 hover:text-white transition-colors"><X size={20} /></button>
            <h2 className="text-sm font-bold text-white">
                {step === 'form' ? 'إضبارة الدعوى المدنية' : 'اختر التصنيف القضائي'}
            </h2>

            <div className="flex items-center justify-end gap-3">
                {step === 'form' && (
                    <button
                        type="button"
                        onClick={onTriggerDemo}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-[#E6C673] hover:bg-[#E6C673] hover:text-[#0F172A] transition-all"
                        title="تعبئة بيانات تجريبية (Demo Mode)"
                    >
                        <FlaskConical size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

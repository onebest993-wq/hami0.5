import React from 'react';
import { X } from 'lucide-react';
import { NC_HEADER } from '../newCaseGlassTheme';

export interface CaseHeaderProps {
    step: 'gateway' | 'selection' | 'form';
    onClose: () => void;
}

export const CaseHeader = ({ step, onClose }: CaseHeaderProps) => {
    return (
        <div className={NC_HEADER}>
            <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
                <X size={20} />
            </button>
            <h2 className="text-sm font-bold text-white/90">
                {step === 'form' ? 'إضبارة الدعوى المدنية' : 'اختر التصنيف القضائي'}
            </h2>
            <div className="w-9" aria-hidden />
        </div>
    );
};

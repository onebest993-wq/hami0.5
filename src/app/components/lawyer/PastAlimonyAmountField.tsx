import React from 'react';

interface PastAlimonyAmountFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    beneficiaryType: 'wife' | 'children';
}

export const PastAlimonyAmountField: React.FC<PastAlimonyAmountFieldProps> = ({
    label,
    value,
    onChange,
    beneficiaryType
}) => {
    const beneficiaryText = beneficiaryType === 'wife' ? 'الزوجة' : 'الأولاد';
    
    return (
        <div>
            <label className="text-xs font-bold text-rose-400 mb-2 block">
                💰 {label || `مقدار النفقة الماضية المحكوم بها (دينار)`}
            </label>
            <input
                type="number"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full bg-rose-950/10 border-2 border-rose-700 text-white p-3 rounded-lg focus:border-rose-500 outline-none font-bold text-lg"
                placeholder="أدخل المبلغ المتراكم المحكوم به..."
            />
            <p className="text-gray-500 text-[10px] mt-1 flex items-center gap-1">
                ℹ️ المبلغ الإجمالي للنفقة المتراكمة المحكوم بها {beneficiaryText}
            </p>
        </div>
    );
};

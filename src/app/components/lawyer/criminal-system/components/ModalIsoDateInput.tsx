import React from 'react';

/** حقل تاريخ ISO موحّد — LTR و placeholder ثابت دون تشوه RTL. */
export const ModalIsoDateInput = ({
    value,
    onChange,
    disabled,
    min,
    max,
    className = '',
}: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    min?: string;
    max?: string;
    className?: string;
}) => (
    <input
        type="date"
        dir="ltr"
        lang="en-CA"
        disabled={disabled}
        min={min}
        max={max}
        placeholder="YYYY-MM-DD"
        title="YYYY-MM-DD"
        className={`w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 disabled:opacity-60 tabular-nums ${className}`.trim()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
    />
);

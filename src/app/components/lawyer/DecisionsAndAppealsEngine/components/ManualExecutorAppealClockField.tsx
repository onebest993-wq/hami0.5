import React from 'react';
import { formatAppealClockYmdLabel } from '../utils';

export type ManualExecutorAppealClockFieldProps = {
    id: string;
    label: string;
    valueYmd: string;
    onChangeYmd?: (ymd: string) => void;
    readOnly?: boolean;
    hint?: string;
};

export function ManualExecutorAppealClockField({
    id,
    label,
    valueYmd,
    onChangeYmd,
    readOnly = false,
    hint,
}: ManualExecutorAppealClockFieldProps) {
    return (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <label htmlFor={id} className="block text-[10px] font-bold text-slate-400">
                {label}
            </label>
            {readOnly ? (
                <p
                    id={id}
                    className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-slate-200"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                >
                    {formatAppealClockYmdLabel(valueYmd)}
                    <span className="mr-2 text-[9px] text-slate-500">({valueYmd})</span>
                </p>
            ) : (
                <input
                    id={id}
                    type="date"
                    value={valueYmd}
                    onChange={(e) => onChangeYmd?.(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white outline-none focus:border-[#E6C673]/40"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                />
            )}
            {hint ? (
                <p className="text-[9px] leading-relaxed text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
}

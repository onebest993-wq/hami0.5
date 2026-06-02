import React from 'react';
import {
    LEGACY_DECRIMINALIZATION_REASON,
    isStageExpirationReason,
    STAGE_EXPIRATION_REASONS,
    type StageExpirationReason,
} from '../stageExpirationReasons';

export type ExpirationReasonFieldsProps = {
    reason: StageExpirationReason | '' | typeof LEGACY_DECRIMINALIZATION_REASON;
    customDetail: string;
    onReasonChange: (value: StageExpirationReason | '') => void;
    onCustomDetailChange: (value: string) => void;
    label?: string;
    /** تنسيق مضغوط داخل بطاقات المودال */
    compact?: boolean;
};

export const ExpirationReasonFields = ({
    reason,
    customDetail,
    onReasonChange,
    onCustomDetailChange,
    label = 'سبب الانقضاء / سقوط الدعوى',
    compact = false,
}: ExpirationReasonFieldsProps) => {
    const showManual = reason === 'custom_manual';
    const selectClass = compact
        ? 'w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#E6C673]/50'
        : 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60';
    const inputClass = compact
        ? 'w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#E6C673]/50 placeholder:text-white/30'
        : 'w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60 placeholder:text-white/30';

    return (
        <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
            <label className={`block text-[#A0AEC0] ${compact ? 'text-[10px] font-light' : 'text-xs'} whitespace-normal break-words`}>
                {label} *
            </label>
            <select
                className={selectClass}
                value={reason}
                onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                        onReasonChange('');
                        onCustomDetailChange('');
                        return;
                    }
                    if (isStageExpirationReason(v) && v !== LEGACY_DECRIMINALIZATION_REASON) {
                        onReasonChange(v as StageExpirationReason);
                        if (v !== 'custom_manual') onCustomDetailChange('');
                    }
                }}
            >
                <option value="">اختر...</option>
                {STAGE_EXPIRATION_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                        {r.label}
                    </option>
                ))}
            </select>
            {showManual ? (
                <input
                    type="text"
                    className={inputClass}
                    value={customDetail}
                    onChange={(e) => onCustomDetailChange(e.target.value)}
                    placeholder="اكتب سبب الانقضاء..."
                    autoComplete="off"
                />
            ) : null}
        </div>
    );
};

import React, { useEffect, useState } from 'react';
import { UserCheck } from '@/app/components/ui/lucideIcons';
import { formatNumberInput } from '@/app/utils/execution/amountInput';

export interface JudicialCustodianInlineFormProps {
    requestTitle?: string;
    initialName?: string;
    initialSalary?: string;
    disabled?: boolean;
    embedded?: boolean;
    /** حارس/حرس مسجّلون مسبقاً في الإضبارة */
    existingCustodians?: Array<{ fullName: string; salary?: string }>;
    onSave: (payload: { name: string; salary: string }) => void;
}

export const JudicialCustodianInlineForm: React.FC<JudicialCustodianInlineFormProps> = ({
    requestTitle,
    initialName = '',
    initialSalary = '',
    disabled = false,
    embedded = false,
    existingCustodians = [],
    onSave,
}) => {
    const [name, setName] = useState('');
    const [salary, setSalary] = useState('');

    useEffect(() => {
        setName(String(initialName || '').trim());
        setSalary(formatNumberInput(String(initialSalary || '').trim()));
    }, [initialName, initialSalary, requestTitle]);

    const hasExisting = existingCustodians.some((c) => String(c.fullName || '').trim());

    const body = (
        <>
            {hasExisting ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-950/20 px-3 py-2 text-right">
                    <p className="text-[10px] font-bold text-amber-100">
                        يوجد حارس قضائي مسجّل في الإضبارة
                    </p>
                    <p className="mt-0.5 text-[9px] leading-relaxed text-amber-200/80">
                        {existingCustodians
                            .map((c) => String(c.fullName || '').trim())
                            .filter(Boolean)
                            .join(' · ')}
                    </p>
                </div>
            ) : null}
            {!embedded && requestTitle ? (
                <p className="text-[10px] text-slate-400 leading-relaxed">{requestTitle}</p>
            ) : null}
            <div>
                <label className="mb-1.5 block text-[10px] font-bold text-slate-300">اسم الحارس القاضي</label>
                <input
                    type="text"
                    value={name}
                    disabled={disabled}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white text-right focus:outline-none focus:border-emerald-500/45 transition-all disabled:opacity-50"
                />
            </div>
            <div>
                <label className="mb-1.5 block text-[10px] font-bold text-slate-300">الراتب (د.ع)</label>
                <input
                    type="text"
                    inputMode="numeric"
                    value={salary}
                    disabled={disabled}
                    onChange={(e) => setSalary(formatNumberInput(e.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white text-right tabular-nums focus:outline-none focus:border-emerald-500/45 transition-all disabled:opacity-50"
                />
            </div>
            <button
                type="button"
                disabled={disabled || !name.trim() || !salary.trim()}
                onClick={() => {
                    const n = name.trim();
                    const s = salary.trim();
                    if (!n || !s) return;
                    onSave({ name: n, salary: s });
                }}
                className="w-full rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 py-2.5 text-[11px] font-black text-white disabled:opacity-40 disabled:cursor-not-allowed"
            >
                حفظ بيانات الحارس القاضي
            </button>
        </>
    );

    if (embedded) {
        return (
            <div className="space-y-2 text-right" dir="rtl">
                {body}
            </div>
        );
    }

    return (
        <div
            className="space-y-3 rounded-xl border border-emerald-500/25 bg-emerald-950/15 p-3 text-right"
            dir="rtl"
        >
            {body}
        </div>
    );
};

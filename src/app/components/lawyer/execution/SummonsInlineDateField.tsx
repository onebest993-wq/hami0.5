import React, { memo } from 'react';
import { Calendar } from '@/app/components/ui/lucideIcons';

export type SummonsDateAccent = 'gold' | 'indigo' | 'violet' | 'amber' | 'cyan' | 'emerald';

const ACCENT = {
    gold: {
        shell: 'border-[#E6C673]/25 bg-[#E6C673]/[0.06]',
        icon: 'text-[#E6C673]/90',
        input: 'border-[#E6C673]/35 focus-visible:ring-[#E6C673]/40',
    },
    indigo: {
        shell: 'border-indigo-500/25 bg-indigo-950/15',
        icon: 'text-indigo-300/85',
        input: 'border-indigo-500/35 focus-visible:ring-indigo-500/50',
    },
    violet: {
        shell: 'border-violet-500/25 bg-violet-950/15',
        icon: 'text-violet-300/85',
        input: 'border-violet-500/35 focus-visible:ring-violet-500/50',
    },
    amber: {
        shell: 'border-amber-500/25 bg-amber-950/15',
        icon: 'text-amber-300/85',
        input: 'border-amber-500/35 focus-visible:ring-amber-500/50',
    },
    cyan: {
        shell: 'border-cyan-500/25 bg-cyan-950/15',
        icon: 'text-cyan-300/85',
        input: 'border-cyan-500/35 focus-visible:ring-cyan-500/50',
    },
    emerald: {
        shell: 'border-emerald-500/25 bg-emerald-950/15',
        icon: 'text-emerald-300/85',
        input: 'border-emerald-500/35 focus-visible:ring-emerald-500/50',
    },
} as const;

export type SummonsInlineDateFieldProps = {
    id: string;
    label: string;
    value: string;
    onChange: (next: string) => void;
    error?: string;
    hint?: string;
    max?: string;
    accent?: SummonsDateAccent;
    className?: string;
};

/** حقل تاريخ مضمّن داخل نافذة التبليغ — يبقى داخل إطار الـ modal (بدون showPicker خارجي). */
export const SummonsInlineDateField = memo(function SummonsInlineDateField({
    id,
    label,
    value,
    onChange,
    error,
    hint,
    max,
    accent = 'gold',
    className = '',
}: SummonsInlineDateFieldProps) {
    const a = ACCENT[accent];

    return (
        <div
            className={`rounded-xl border px-3 py-3 shadow-inner shadow-black/15 ${a.shell} ${className}`}
            dir="rtl"
        >
            <label
                htmlFor={id}
                className="mb-2 flex flex-row-reverse items-center gap-2 text-[11px] font-bold text-slate-200"
            >
                <Calendar size={14} className={`shrink-0 ${a.icon}`} aria-hidden />
                {label}
            </label>
            <input
                id={id}
                type="date"
                value={value}
                max={max}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full min-h-[44px] touch-manipulation rounded-xl border bg-[#0A0F1C]/90 px-3 py-2.5 text-right text-sm font-mono text-white shadow-inner shadow-black/25 [color-scheme:dark] focus:outline-none focus-visible:ring-2 ${a.input}`}
            />
            {error ? (
                <p className="mt-1.5 text-right text-[11px] font-bold text-rose-300" role="alert">
                    {error}
                </p>
            ) : hint ? (
                <p className="mt-1.5 text-right text-[10px] leading-relaxed text-slate-500">{hint}</p>
            ) : null}
        </div>
    );
});

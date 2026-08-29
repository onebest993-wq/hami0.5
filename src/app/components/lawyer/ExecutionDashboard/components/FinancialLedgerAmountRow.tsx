import React from 'react';

const TONE_CLASS: Record<string, { border: string; bg: string; amount: string }> = {
    amber: {
        border: 'border-amber-500/20',
        bg: 'bg-slate-900/40',
        amount: 'text-amber-200/95',
    },
    emerald: {
        border: 'border-emerald-500/25',
        bg: 'bg-emerald-950/30',
        amount: 'text-emerald-200/90',
    },
    violet: {
        border: 'border-violet-500/20',
        bg: 'bg-violet-950/25',
        amount: 'text-violet-200/90',
    },
    cyan: {
        border: 'border-cyan-500/25',
        bg: 'bg-cyan-950/20',
        amount: 'text-cyan-200/90',
    },
    orange: {
        border: 'border-orange-500/25',
        bg: 'bg-orange-950/20',
        amount: 'text-orange-200/90',
    },
    sky: {
        border: 'border-sky-500/25',
        bg: 'bg-sky-950/20',
        amount: 'text-sky-200/90',
    },
};

export type FinancialLedgerAmountRowProps = {
    tone: keyof typeof TONE_CLASS;
    label: string;
    amount: number;
    hint?: string;
};

/** صف مبلغ موحّد في السجل المالي — يقلّل تكرار class stacks */
export function FinancialLedgerAmountRow({
    tone,
    label,
    amount,
    hint,
}: FinancialLedgerAmountRowProps) {
    const t = TONE_CLASS[tone] ?? TONE_CLASS.amber;
    return (
        <div
            className={`flex flex-row-reverse items-center justify-between gap-2 rounded-lg border p-3 ${t.border} ${t.bg}`}
        >
            <div className="min-w-0 flex-1 text-right">
                <span className="block text-sm font-medium text-slate-200">{label}</span>
                {hint ? (
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">{hint}</span>
                ) : null}
            </div>
            <span className={`shrink-0 text-base font-bold tabular-nums ${t.amount}`}>
                {amount.toLocaleString('ar-IQ')}
            </span>
        </div>
    );
}

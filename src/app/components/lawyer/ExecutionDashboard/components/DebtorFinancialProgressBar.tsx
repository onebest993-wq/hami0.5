import React from 'react';

type DebtorFinancialProgressBarProps = {
    allocated: number;
    paid: number;
    label: string;
};

export function DebtorFinancialProgressBar({
    allocated,
    paid,
    label,
}: DebtorFinancialProgressBarProps) {
    const alloc = Number(allocated) || 0;
    const paidN = Number(paid) || 0;
    const percent = alloc > 0 ? Math.min(100, Math.round((paidN / alloc) * 100)) : 0;

    return (
        <div className="px-1 py-2">
            <div className="mb-1 flex items-center justify-between text-[9px] text-slate-500">
                <span>{percent}%</span>
                <span className="text-slate-400">{label}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500/80 to-amber-500/80 transition-[width] duration-300"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

import React from 'react';

export type CollapsedSummaryCell = {
    label: string;
    value: string;
    mono?: boolean;
};

type GuarantorCollapsedSummaryProps = {
    cells: CollapsedSummaryCell[];
};

/** ملخص مطوي في صف واحد — للعرض السريع دون توسيع البطاقة */
export const GuarantorCollapsedSummary: React.FC<GuarantorCollapsedSummaryProps> = ({ cells }) => {
    if (cells.length === 0) return null;

    return (
        <div
            className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] via-white/[0.03] to-transparent px-2.5 py-2.5"
            dir="rtl"
        >
            <div className="flex flex-row items-stretch divide-x divide-white/10">
                {cells.map((cell) => (
                    <div
                        key={`${cell.label}-${cell.value}`}
                        className="min-w-0 flex-1 px-2 text-right first:pr-0 last:pl-0"
                    >
                        <p className="truncate text-[9px] text-slate-500">{cell.label}</p>
                        <p
                            className={`truncate text-[12px] font-bold text-white ${cell.mono ? 'font-mono tabular-nums' : ''}`}
                            dir={cell.mono ? 'ltr' : undefined}
                        >
                            {cell.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
};

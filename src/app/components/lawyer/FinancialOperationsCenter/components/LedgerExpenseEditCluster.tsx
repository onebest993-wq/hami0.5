import React from 'react';
import { Wallet, PencilLine } from 'lucide-react';

interface LedgerExpenseEditClusterProps {
    onExpenses: () => void;
    onEditFees: () => void;
    hideFees?: boolean;
}

function LedgerExpenseEditCluster({
    onExpenses,
    onEditFees,
    hideFees = false,
}: LedgerExpenseEditClusterProps) {
    return (
        <div className="inline-flex items-stretch gap-0 rounded-lg bg-white/5 border border-white/10 p-1 shadow-inner shadow-black/10">
            <button
                type="button"
                onClick={onExpenses}
                className="inline-flex items-center justify-center gap-1 min-w-[5.1rem] py-1.5 px-2 rounded-md text-sky-200/95 hover:bg-white/10 transition"
            >
                <Wallet size={14} strokeWidth={1.8} className="shrink-0" />
                <span className="text-[10px] font-semibold text-slate-300 leading-tight text-center">
                    مصاريف الإضبارة
                </span>
            </button>
            {!hideFees && (
                <>
                    <span className="w-px bg-white/10 self-stretch my-1" aria-hidden />
                    <button
                        type="button"
                        onClick={onEditFees}
                        className="inline-flex items-center justify-center gap-1 min-w-[3.8rem] py-1.5 px-2 rounded-md text-emerald-200/95 hover:bg-white/10 transition"
                    >
                        <PencilLine size={13} strokeWidth={1.85} className="shrink-0" />
                        <span className="text-[10px] font-semibold text-slate-300 leading-tight text-center">
                            تعديل
                        </span>
                    </button>
                </>
            )}
        </div>
    );
}

export default LedgerExpenseEditCluster;

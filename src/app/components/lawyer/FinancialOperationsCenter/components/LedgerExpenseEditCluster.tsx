import React from 'react';
import { PencilLine } from '@/app/components/ui/icons/PencilLine';
import {
    focPrepareOverlay,
    prefetchFocExpenseSheet,
    prefetchFocFeesSheet,
} from '../focOverlaySurfacesLazy';

interface LedgerExpenseEditClusterProps {
    onExpenses: () => void;
    onEditFees: () => void;
    hideFees?: boolean;
    compact?: boolean;
}

function LedgerExpenseEditCluster({
    onExpenses,
    onEditFees,
    hideFees = false,
    compact = false,
}: LedgerExpenseEditClusterProps) {
    return (
        <div
            className={
                compact
                    ? 'inline-flex items-stretch gap-0 rounded-md border border-white/10 bg-white/[0.03] p-0.5'
                    : 'inline-flex items-stretch gap-0 rounded-lg bg-white/5 border border-white/10 p-1 shadow-inner shadow-black/10'
            }
        >
            <button
                type="button"
                {...focPrepareOverlay(prefetchFocExpenseSheet)}
                onClick={onExpenses}
                className={
                    compact
                        ? 'inline-flex items-center justify-center px-2 py-1 rounded text-[9px] font-semibold text-slate-300 hover:bg-white/[0.06] transition'
                        : 'inline-flex items-center justify-center gap-1 min-w-[5.1rem] py-1.5 px-2 rounded-md text-sky-200/95 hover:bg-white/10 transition'
                }
            >
                <span
                    className={
                        compact
                            ? 'text-[9px] font-semibold text-slate-300 leading-tight text-center'
                            : 'text-[10px] font-semibold text-slate-300 leading-tight text-center'
                    }
                >
                    مصاريف الإضبارة
                </span>
            </button>
            {!hideFees && (
                <>
                    <span className="w-px bg-white/10 self-stretch my-1" aria-hidden />
                    <button
                        type="button"
                        {...focPrepareOverlay(prefetchFocFeesSheet)}
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

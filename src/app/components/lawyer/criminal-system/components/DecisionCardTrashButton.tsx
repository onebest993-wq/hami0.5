import React from 'react';
import { Trash2 } from 'lucide-react';

export type DecisionCardTrashButtonProps = {
    onClick: () => void;
    disabled?: boolean;
    className?: string;
};

/** زر نقل بطاقة القرار إلى سلة المهملات — أعلى اليسار، أيقونة فقط. */
export const DecisionCardTrashButton = ({
    onClick,
    disabled,
    className = '',
}: DecisionCardTrashButtonProps) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title="نقل إلى سلة المهملات"
        aria-label="نقل إلى سلة المهملات"
        className={`absolute top-3 left-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-950/50 text-white/40 shadow-sm backdrop-blur-sm transition hover:border-red-400/45 hover:bg-red-500/12 hover:text-red-200/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 disabled:pointer-events-none disabled:opacity-35 ${className}`}
    >
        <Trash2 className="w-3.5 h-3.5" aria-hidden />
    </button>
);

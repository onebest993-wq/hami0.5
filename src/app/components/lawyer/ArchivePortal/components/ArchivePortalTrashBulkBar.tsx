import React from 'react';
import { motion } from 'motion/react';

type ArchivePortalTrashBulkBarProps = {
    selectedCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onBeginPermanentDelete: () => void;
    animated?: boolean;
};

export function ArchivePortalTrashBulkBar({
    selectedCount,
    onSelectAll,
    onClearSelection,
    onBeginPermanentDelete,
    animated = false,
}: ArchivePortalTrashBulkBarProps) {
    const Wrapper = animated ? motion.div : 'div';
    const wrapperProps = animated
        ? { className: 'px-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3' }
        : { className: 'px-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3' };

    return (
        <Wrapper {...wrapperProps}>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    onClick={onSelectAll}
                    className="text-xs font-bold text-slate-300 border border-white/15 rounded-lg px-3 py-2 hover:bg-white/5"
                >
                    تحديد الكل
                </button>
                <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-xs font-bold text-slate-400 border border-white/10 rounded-lg px-3 py-2 hover:bg-white/5"
                >
                    إلغاء التحديد
                </button>
                <span className="text-xs text-slate-500">محدد: {selectedCount}</span>
            </div>
            <button
                type="button"
                disabled={selectedCount === 0}
                onClick={onBeginPermanentDelete}
                className="text-xs font-bold rounded-xl px-4 py-2.5 border border-rose-500/50 bg-rose-950/50 text-rose-100 hover:bg-rose-900/60 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                حذف نهائي للمحدد…
            </button>
        </Wrapper>
    );
}

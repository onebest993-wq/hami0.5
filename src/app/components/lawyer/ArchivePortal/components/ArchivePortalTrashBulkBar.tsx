import React from 'react';

type ArchivePortalTrashBulkBarProps = {
    selectedCount: number;
    onSelectAll: () => void;
    onClearSelection: () => void;
    onBeginPermanentDelete: () => void;
    selectAllTestId?: string;
    permanentDeleteTestId?: string;
};

const BAR_CLASS =
    'px-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-3';

export function ArchivePortalTrashBulkBar({
    selectedCount,
    onSelectAll,
    onClearSelection,
    onBeginPermanentDelete,
    selectAllTestId,
    permanentDeleteTestId,
}: ArchivePortalTrashBulkBarProps) {
    return (
        <div className={BAR_CLASS}>
            <div className="flex flex-wrap items-center gap-2">
                <button
                    type="button"
                    data-testid={selectAllTestId}
                    onClick={onSelectAll}
                    className="text-xs font-bold text-slate-300 border border-white/15 rounded-lg px-3 py-2 min-h-[44px] hover:bg-white/5 touch-manipulation"
                >
                    تحديد الكل
                </button>
                <button
                    type="button"
                    onClick={onClearSelection}
                    className="text-xs font-bold text-slate-400 border border-white/10 rounded-lg px-3 py-2 min-h-[44px] hover:bg-white/5 touch-manipulation"
                >
                    إلغاء التحديد
                </button>
                <span className="text-xs text-slate-500">محدد: {selectedCount}</span>
            </div>
            <button
                type="button"
                data-testid={permanentDeleteTestId}
                disabled={selectedCount === 0}
                onClick={onBeginPermanentDelete}
                className="text-xs font-bold rounded-xl px-4 py-2.5 min-h-[44px] border border-rose-500/50 bg-rose-950/50 text-rose-100 hover:bg-rose-900/60 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
            >
                حذف نهائي للمحدد…
            </button>
        </div>
    );
}

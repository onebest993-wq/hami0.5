import React from 'react';

export type DebtorCardRowInlineStatusChipsProps = {
    showDeceased: boolean;
    appealLabel: string | null;
    onOpenAppeals?: () => void;
    showUnservedMemo: boolean;
    onUnservedMemo: () => void;
};

/** شارات متوفى / طعن / غير مبلّغ في الصف المطوي */
export function DebtorCardRowInlineStatusChips({
    showDeceased,
    appealLabel,
    onOpenAppeals,
    showUnservedMemo,
    onUnservedMemo,
}: DebtorCardRowInlineStatusChipsProps) {
    if (!showDeceased && !appealLabel && !showUnservedMemo) return null;

    return (
        <div
            className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="presentation"
            dir="rtl"
        >
            {showDeceased ? (
                <span className="shrink-0 rounded-md border border-rose-500/40 bg-rose-950/40 px-1.5 py-0.5 text-[10px] font-bold leading-none text-rose-200/95 select-none">
                    متوفى
                </span>
            ) : null}
            {appealLabel && onOpenAppeals ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenAppeals();
                    }}
                    className="shrink-0 whitespace-nowrap inline-flex items-center rounded-md border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-normal text-red-500 transition-colors hover:bg-red-500/15"
                    title={`طعن ساري: ${appealLabel} — افتح مركز الطعون`}
                >
                    {appealLabel}
                </button>
            ) : null}
            {showUnservedMemo ? (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onUnservedMemo();
                    }}
                    className="shrink-0 whitespace-nowrap rounded-md border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-500/15"
                    title="لم يُسجَّل بعد تبليغ بمذكرة الإخبار بالتنفيذ"
                >
                    غير مبلّغ
                </button>
            ) : null}
        </div>
    );
}

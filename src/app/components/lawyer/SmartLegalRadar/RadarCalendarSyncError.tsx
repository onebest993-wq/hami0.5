import React from 'react';

type RadarCalendarSyncErrorProps = {
    message: string;
    onRetry: () => void;
};

/** شريط الخطأ — النقر يعيد المزامنة؛ تلميح «إعادة المحاولة» يوضح أنه عنصر تفاعلي */
export const RadarCalendarSyncError = React.memo(function RadarCalendarSyncError({
    message,
    onRetry,
}: RadarCalendarSyncErrorProps) {
    return (
        <div
            className="mb-3 flex min-h-[44px] items-center justify-between gap-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm px-3 py-2.5"
            role="alert"
            data-testid="radar-calendar-error"
            tabIndex={0}
            aria-label={`${message} — انقر لإعادة المحاولة`}
            onClick={onRetry}
            onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onRetry();
            }}
        >
            <span className="min-w-0 text-right leading-relaxed">{message}</span>
            <span className="shrink-0 text-[12px] font-semibold text-rose-200/90">إعادة المحاولة</span>
        </div>
    );
});

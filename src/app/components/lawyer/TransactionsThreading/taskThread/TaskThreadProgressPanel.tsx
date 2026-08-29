import { memo } from 'react';
import { TX_TEXT_MUTED, TX_TEXT_PRIMARY } from '../transactionsGlassTheme';

export const TaskThreadProgressPanel = memo(function TaskThreadProgressPanel({
    done,
    total,
    percent,
}: {
    done: number;
    total: number;
    percent: number;
}) {
    return (
        <div className="py-1">
            <div className="flex items-center justify-between gap-2">
                <div className={`${TX_TEXT_PRIMARY} font-semibold text-xs`}>نسبة الإنجاز</div>
                <div className={`${TX_TEXT_MUTED} text-[11px] font-medium tabular-nums`}>
                    {done}/{total} · {percent}%
                </div>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                    className="h-full rounded-full bg-[#E6C673] "
                    style={{ width: `${Math.max(percent, total > 0 ? 4 : 0)}%` }}
                />
            </div>
        </div>
    );
});

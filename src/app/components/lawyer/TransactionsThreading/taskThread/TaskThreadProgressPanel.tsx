import { memo } from 'react';
import { TX_TEXT_MUTED, TX_TEXT_OCHRE, TX_TEXT_PRIMARY, TxGlassPanel } from '../transactionsGlassTheme';

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
        <TxGlassPanel className="p-4 sm:p-5">
            <div className="flex items-center gap-4">
                <div
                    className="relative shrink-0 w-[4.25rem] h-[4.25rem] rounded-full border-2 border-[#2A4550] flex items-center justify-center bg-[#0A171D]"
                    aria-hidden
                >
                    <div
                        className="absolute inset-1 rounded-full"
                        style={{
                            background: `conic-gradient(#C4782F ${percent * 3.6}deg, #1A3340 0deg)`,
                        }}
                    />
                    <div className="absolute inset-[5px] rounded-full bg-[#152A32] flex items-center justify-center">
                        <span className={`${TX_TEXT_OCHRE} font-extrabold text-lg tabular-nums leading-none`}>
                            {percent}%
                        </span>
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className={`${TX_TEXT_PRIMARY} font-extrabold text-sm`}>نسبة الإنجاز</div>
                        <div className={`${TX_TEXT_MUTED} text-xs font-medium tabular-nums`}>
                            {done}/{total}
                        </div>
                    </div>
                    <div className="mt-3 h-2.5 rounded-[3px] bg-[#0A171D] border border-[#2A4550]/80 overflow-hidden">
                        <div
                            className="h-full rounded-[2px] bg-gradient-to-r from-[#9A6024] via-[#C4782F] to-[#D49248] transition-[width] duration-500"
                            style={{ width: `${Math.max(percent, total > 0 ? 4 : 0)}%` }}
                        />
                    </div>
                    <div className={`mt-2.5 ${TX_TEXT_MUTED} text-xs font-medium`}>
                        {done} من {total} مهمة منجزة
                    </div>
                </div>
            </div>
        </TxGlassPanel>
    );
});

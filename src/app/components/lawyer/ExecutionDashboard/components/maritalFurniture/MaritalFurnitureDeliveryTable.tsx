import { Lock } from '@/app/components/ui/icons/Lock';
import { Search } from '@/app/components/ui/icons/Search';
import {
    formatMaritalFurnitureIqd,
    isMaritalFurnitureItemDeliveryLocked,
    lineTotalIqd,
} from '@/app/utils/maritalFurniture';
import { isScheduleYmdReached } from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import type { MaritalFurnitureDeliveryOutcome, MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import { MaritalFurnitureDeliveryRowActions } from './MaritalFurnitureDeliveryRowActions';
import {
    MARITAL_FURNITURE_SEARCH_MIN,
    MARITAL_FURNITURE_TABLE_GRID,
} from './maritalFurnitureModuleConstants';

export type MaritalFurnitureDeliveryTableProps = {
    displayItems: MaritalFurnitureItem[];
    search: string;
    setSearch: (value: string) => void;
    visibleItems: MaritalFurnitureItem[];
    scheduleYmd: string;
    todayYmd: string;
    earlyDeliveryUnlocked: boolean;
    savingItemId: string | null;
    locked: boolean;
    pendingDelivery: { itemId: string; outcome: MaritalFurnitureDeliveryOutcome; itemName: string } | null;
    setPendingDelivery: (
        value: { itemId: string; outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>; itemName: string } | null,
    ) => void;
    confirmPendingDelivery: () => void;
    requestItemOutcome: (itemId: string, outcome: MaritalFurnitureDeliveryOutcome) => void;
};

export function MaritalFurnitureDeliveryTable({
    displayItems,
    search,
    setSearch,
    visibleItems,
    scheduleYmd,
    todayYmd,
    earlyDeliveryUnlocked,
    savingItemId,
    locked,
    pendingDelivery,
    setPendingDelivery,
    confirmPendingDelivery,
    requestItemOutcome,
}: MaritalFurnitureDeliveryTableProps) {
    return (
        <>
            {displayItems.length >= MARITAL_FURNITURE_SEARCH_MIN ? (
                <div className="relative">
                    <Search
                        size={15}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث في قائمة الأثاث…"
                        className="w-full bg-black/30 border border-white/10 text-white text-sm pr-10 pl-3 py-2.5 rounded-xl focus:border-[#E6C673]/40 outline-none text-right min-h-[44px]"
                    />
                </div>
            ) : null}

            <p className="text-[10px] text-slate-400 text-right leading-relaxed px-0.5">
                {scheduleYmd && !isScheduleYmdReached(scheduleYmd, todayYmd) && !earlyDeliveryUnlocked
                    ? 'قبل الموعد: «تسليم خارجي» فقط — يُقفل الصف ولا يدخل المركز المالي.'
                    : 'بعد الموعد: «تسليم» أو «تعذّر» — التعذّر فقط ينتقل للمركز المالي.'}
            </p>

            <div className="overflow-hidden rounded-2xl border border-white/10">
                <div className="max-h-[min(42dvh,300px)] overflow-y-auto overscroll-contain">
                    <div
                        className={`sticky top-0 z-10 ${MARITAL_FURNITURE_TABLE_GRID} py-2 bg-[#0A0F1C] border-b border-white/10 text-[10px] font-bold text-slate-400 text-right items-center`}
                    >
                        <span>اسم الأثاث</span>
                        <span className="text-center">العدد</span>
                        <span>السعر</span>
                        <span>الإجمالي</span>
                        <span className="text-center">التسليم</span>
                    </div>
                    {visibleItems.length === 0 ? (
                        <p className="px-3 py-8 text-center text-sm text-slate-500">لا توجد نتائج</p>
                    ) : (
                        visibleItems.map((row) => {
                            const rowDeliveryLocked = isMaritalFurnitureItemDeliveryLocked(row);
                            return (
                                <div
                                    key={row.id}
                                    className={`${MARITAL_FURNITURE_TABLE_GRID} py-2.5 min-h-[44px] border-b border-white/5 text-right even:bg-white/[0.015] items-center ${
                                        rowDeliveryLocked ? 'bg-white/[0.02] opacity-90' : ''
                                    }`}
                                >
                                    <span className="font-bold text-white text-[11px] leading-snug break-words min-w-0 flex items-start gap-1 justify-end">
                                        {rowDeliveryLocked ? (
                                            <Lock
                                                size={10}
                                                className="shrink-0 text-slate-500 mt-0.5"
                                                aria-hidden
                                            />
                                        ) : null}
                                        <span className={rowDeliveryLocked ? 'text-slate-300' : ''}>
                                            {row.name}
                                        </span>
                                    </span>
                                    <span className="text-slate-300 font-mono text-[11px] text-center">
                                        {row.quantity}
                                    </span>
                                    <span className="text-slate-300 font-mono text-[10px] tabular-nums truncate">
                                        {formatMaritalFurnitureIqd(row.unitPriceIqd)}
                                    </span>
                                    <span className="text-[#E6C673] font-bold font-mono text-[10px] tabular-nums truncate">
                                        {formatMaritalFurnitureIqd(lineTotalIqd(row))}
                                    </span>
                                    <MaritalFurnitureDeliveryRowActions
                                        row={row}
                                        scheduleYmd={scheduleYmd}
                                        todayYmd={todayYmd}
                                        earlyDeliveryUnlocked={earlyDeliveryUnlocked}
                                        busy={savingItemId === row.id}
                                        locked={locked}
                                        isPendingConfirm={pendingDelivery?.itemId === row.id}
                                        onConfirmPending={() => {
                                            if (pendingDelivery?.itemId === row.id) {
                                                confirmPendingDelivery();
                                            }
                                        }}
                                        onCancelPending={() => {
                                            if (pendingDelivery?.itemId === row.id) {
                                                setPendingDelivery(null);
                                            }
                                        }}
                                        onRequestOutcome={requestItemOutcome}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}

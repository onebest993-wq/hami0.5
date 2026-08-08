import { Calendar, Lock, Pencil, Search } from '@/app/components/ui/lucideIcons';
import { MaritalFurnitureSetupSection } from '@/app/components/lawyer/ExecutionCreationView/components/MaritalFurnitureSetupSection';
import { parseMoneyInput } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    formatMaritalFurnitureIqd,
    areAllMaritalFurnitureItemsDeliveryLocked,
    isMaritalFurnitureItemDeliveryLocked,
    lineTotalIqd,
} from '@/app/utils/maritalFurniture';
import { isScheduleYmdReached } from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import { handleMoneyInputChange } from '@/app/utils/moneyInput';
import { MaritalFurnitureDeliveryRowActions } from './MaritalFurnitureDeliveryRowActions';
import {
    MARITAL_FURNITURE_SEARCH_MIN,
    MARITAL_FURNITURE_TABLE_GRID,
} from './maritalFurnitureModuleConstants';
import { formatMaritalFurnitureCurrency } from './maritalFurnitureModuleUtils';
import { useMaritalFurnitureModuleState } from './useMaritalFurnitureModuleState';

type UseMaritalFurnitureModuleStateReturn = ReturnType<typeof useMaritalFurnitureModuleState>;

export type MaritalFurnitureWorkspaceBodyProps = Pick<
    UseMaritalFurnitureModuleStateReturn,
    | 'isEditing'
    | 'deliveryRecorded'
    | 'draftItems'
    | 'setDraftItems'
    | 'isDeliveredRowLocked'
    | 'editTotal'
    | 'displayItems'
    | 'locked'
    | 'startEdit'
    | 'canManageDelivery'
    | 'scheduleYmd'
    | 'showScheduleForm'
    | 'scheduleYmdDraft'
    | 'setScheduleYmdDraft'
    | 'todayYmd'
    | 'savingSchedule'
    | 'handleSaveSchedule'
    | 'setEditingSchedule'
    | 'scheduleLabel'
    | 'earlyDeliveryUnlocked'
    | 'unlockEarlyDelivery'
    | 'deliveryCounts'
    | 'deliveredTotal'
    | 'undeliveredTotal'
    | 'search'
    | 'setSearch'
    | 'visibleItems'
    | 'savingItemId'
    | 'pendingDelivery'
    | 'setPendingDelivery'
    | 'confirmPendingDelivery'
    | 'requestItemOutcome'
    | 'total'
    | 'remainingListTotal'
>;

export function MaritalFurnitureWorkspaceBody({
    isEditing,
    deliveryRecorded,
    draftItems,
    setDraftItems,
    isDeliveredRowLocked,
    editTotal,
    displayItems,
    locked,
    startEdit,
    canManageDelivery,
    scheduleYmd,
    showScheduleForm,
    scheduleYmdDraft,
    setScheduleYmdDraft,
    todayYmd,
    savingSchedule,
    handleSaveSchedule,
    setEditingSchedule,
    scheduleLabel,
    earlyDeliveryUnlocked,
    unlockEarlyDelivery,
    deliveryCounts,
    deliveredTotal,
    undeliveredTotal,
    search,
    setSearch,
    visibleItems,
    savingItemId,
    pendingDelivery,
    setPendingDelivery,
    confirmPendingDelivery,
    requestItemOutcome,
    total,
    remainingListTotal,
}: MaritalFurnitureWorkspaceBodyProps) {
    const allDeliveryLocked = areAllMaritalFurnitureItemsDeliveryLocked(displayItems);

    return (
        <div className="space-y-4">
            {isEditing ? (
                <>
                    {deliveryRecorded ? (
                        <p className="text-[11px] text-amber-300/90 text-right rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                            القطع المُسلَّمة مقفلة — يمكنك تعديل أو حذف غير المُسلَّم فقط.
                        </p>
                    ) : null}
                    <MaritalFurnitureSetupSection
                        items={draftItems}
                        onChange={setDraftItems}
                        formatCurrency={formatMaritalFurnitureCurrency}
                        onPriceInput={(e, onParsed) => {
                            handleMoneyInputChange(e.target.value, (raw) => {
                                onParsed(parseMoneyInput(raw));
                            });
                        }}
                        isRowLocked={isDeliveredRowLocked}
                        allowAddRows={!deliveryRecorded}
                    />
                    <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-4 py-3 text-right">
                        <p className="text-[10px] text-slate-400">المجموع الكلي (قبل الحفظ)</p>
                        <p className="text-xl font-black text-[#E6C673] font-mono">
                            {formatMaritalFurnitureIqd(editTotal)} <span className="text-xs">د.ع</span>
                        </p>
                    </div>
                </>
            ) : displayItems.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-8 text-center">
                    <p className="text-sm text-slate-400">لم تُسجَّل قطع الأثاث بعد.</p>
                    {!locked ? (
                        <button
                            type="button"
                            onClick={startEdit}
                            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-4 py-2 text-xs font-bold text-[#E6C673] hover:bg-[#E6C673]/20 touch-manipulation"
                        >
                            إضافة أول قطعة
                        </button>
                    ) : null}
                </div>
            ) : (
                <>
                    {canManageDelivery &&
                    !allDeliveryLocked &&
                    (scheduleYmd || showScheduleForm) ? (
                        <div className="rounded-xl border border-sky-500/25 bg-sky-500/6 px-3 py-3 text-right space-y-2">
                            <p className="text-[11px] font-bold text-sky-200">موعد التسليم الميداني</p>
                            {showScheduleForm ? (
                                <div className="flex flex-col gap-2">
                                    <input
                                        type="date"
                                        value={scheduleYmdDraft || scheduleYmd}
                                        min={todayYmd}
                                        onChange={(e) => setScheduleYmdDraft(e.target.value)}
                                        className="w-full bg-black/30 border border-white/12 text-white text-sm px-3 py-2.5 rounded-xl focus:border-sky-400/45 outline-none text-right min-h-[44px]"
                                    />
                                    <div className="flex flex-row-reverse gap-2">
                                        <button
                                            type="button"
                                            data-testid="marital-furniture-save-schedule"
                                            disabled={savingSchedule || !(scheduleYmdDraft || scheduleYmd).trim()}
                                            onClick={handleSaveSchedule}
                                            className="inline-flex flex-1 min-h-[44px] items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-bold text-sky-100 hover:bg-sky-500/25 disabled:opacity-45 touch-manipulation"
                                        >
                                            حفظ الموعد
                                        </button>
                                        {scheduleYmd ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingSchedule(false);
                                                    setScheduleYmdDraft('');
                                                }}
                                                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10 touch-manipulation"
                                            >
                                                إلغاء
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 flex-row-reverse justify-between">
                                    <div className="flex items-center gap-2 flex-row-reverse min-w-0">
                                        <Calendar size={15} className="text-sky-300 shrink-0" />
                                        <p className="text-xs text-sky-100/95 leading-snug">{scheduleLabel}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setScheduleYmdDraft(scheduleYmd);
                                            setEditingSchedule(true);
                                        }}
                                        className="shrink-0 inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-bold text-sky-200 hover:bg-sky-500/18 touch-manipulation"
                                    >
                                        <Pencil size={11} />
                                        تعديل
                                    </button>
                                </div>
                            )}
                            {scheduleYmd &&
                            !showScheduleForm &&
                            !isScheduleYmdReached(scheduleYmd, todayYmd) &&
                            !earlyDeliveryUnlocked ? (
                                <button
                                    type="button"
                                    onClick={unlockEarlyDelivery}
                                    className="w-full text-[10px] font-bold text-amber-300/90 underline underline-offset-2 text-right touch-manipulation min-h-[36px]"
                                >
                                    تفعيل التسليم قبل الموعد
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    {deliveryRecorded ? (
                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 space-y-1 text-[11px]">
                            <p className="text-emerald-300/90">
                                مُسلَّم / خارجي: {deliveryCounts.delivered + deliveryCounts.external}{' '}
                                قطعة — {formatMaritalFurnitureIqd(deliveredTotal)} د.ع
                            </p>
                            <p className="text-rose-300/90">
                                تعذّر (المركز المالي): {deliveryCounts.failed} قطعة —{' '}
                                {formatMaritalFurnitureIqd(undeliveredTotal)} د.ع
                            </p>
                        </div>
                    ) : null}

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
                        <div className="max-h-[min(42vh,300px)] overflow-y-auto overscroll-contain">
                            <div
                                className={`sticky top-0 z-10 ${MARITAL_FURNITURE_TABLE_GRID} py-2 bg-[#0A0F1C]/98 border-b border-white/10 text-[10px] font-bold text-slate-400 text-right backdrop-blur-sm items-center`}
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

                    <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-4 py-3 text-right space-y-1">
                        {deliveryRecorded ? (
                            <>
                                <p className="text-[10px] text-slate-400">المتبقي للقائمة</p>
                                <p className="text-xl font-black text-[#E6C673] font-mono">
                                    {formatMaritalFurnitureIqd(remainingListTotal)}{' '}
                                    <span className="text-xs">د.ع</span>
                                </p>
                                <p className="text-[11px] text-emerald-300/90 pt-1 border-t border-white/5">
                                    مُسلَّم:{' '}
                                    <span className="font-bold font-mono">
                                        {formatMaritalFurnitureIqd(deliveredTotal)} د.ع
                                    </span>
                                    <span className="text-slate-500 mx-1">·</span>
                                    <span className="text-slate-400">
                                        المجموع الكلي {formatMaritalFurnitureIqd(total)} د.ع
                                    </span>
                                </p>
                                {undeliveredTotal > 0 ? (
                                    <p className="text-[11px] text-rose-300/90">
                                        في المركز المالي (تعذّر):{' '}
                                        <span className="font-bold font-mono">
                                            {formatMaritalFurnitureIqd(undeliveredTotal)} د.ع
                                        </span>
                                    </p>
                                ) : null}
                            </>
                        ) : (
                            <>
                                <p className="text-[10px] text-slate-400">المجموع الكلي للقائمة</p>
                                <p className="text-xl font-black text-[#E6C673] font-mono">
                                    {formatMaritalFurnitureIqd(total)}{' '}
                                    <span className="text-xs">د.ع</span>
                                </p>
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

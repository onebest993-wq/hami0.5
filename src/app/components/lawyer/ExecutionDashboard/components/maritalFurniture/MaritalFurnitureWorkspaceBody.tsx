import { MaritalFurnitureSetupSection } from '@/app/components/lawyer/ExecutionCreationView/components/MaritalFurnitureSetupSection';
import { parseMoneyInput } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    formatMaritalFurnitureIqd,
    areAllMaritalFurnitureItemsDeliveryLocked,
} from '@/app/utils/maritalFurniture';
import { handleMoneyInputChange } from '@/app/utils/moneyInput';
import { formatMaritalFurnitureCurrency } from './maritalFurnitureModuleUtils';
import { useMaritalFurnitureModuleState } from './useMaritalFurnitureModuleState';
import { MaritalFurnitureSchedulePanel } from './MaritalFurnitureSchedulePanel';
import { MaritalFurnitureDeliveryTable } from './MaritalFurnitureDeliveryTable';
import { MaritalFurnitureTotalsFooter } from './MaritalFurnitureTotalsFooter';

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

export function MaritalFurnitureWorkspaceBody(props: MaritalFurnitureWorkspaceBodyProps) {
    const {
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
        deliveryCounts,
        deliveredTotal,
        undeliveredTotal,
        total,
        remainingListTotal,
    } = props;
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
                    {canManageDelivery && !allDeliveryLocked && (scheduleYmd || showScheduleForm) ? (
                        <MaritalFurnitureSchedulePanel
                            scheduleYmd={props.scheduleYmd}
                            showScheduleForm={props.showScheduleForm}
                            scheduleYmdDraft={props.scheduleYmdDraft}
                            setScheduleYmdDraft={props.setScheduleYmdDraft}
                            todayYmd={props.todayYmd}
                            savingSchedule={props.savingSchedule}
                            handleSaveSchedule={props.handleSaveSchedule}
                            setEditingSchedule={props.setEditingSchedule}
                            scheduleLabel={props.scheduleLabel}
                            earlyDeliveryUnlocked={props.earlyDeliveryUnlocked}
                            unlockEarlyDelivery={props.unlockEarlyDelivery}
                        />
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

                    <MaritalFurnitureDeliveryTable
                        displayItems={displayItems}
                        search={props.search}
                        setSearch={props.setSearch}
                        visibleItems={props.visibleItems}
                        scheduleYmd={props.scheduleYmd}
                        todayYmd={props.todayYmd}
                        earlyDeliveryUnlocked={props.earlyDeliveryUnlocked}
                        savingItemId={props.savingItemId}
                        locked={locked}
                        pendingDelivery={props.pendingDelivery}
                        setPendingDelivery={props.setPendingDelivery}
                        confirmPendingDelivery={props.confirmPendingDelivery}
                        requestItemOutcome={props.requestItemOutcome}
                    />

                    <MaritalFurnitureTotalsFooter
                        deliveryRecorded={deliveryRecorded}
                        remainingListTotal={remainingListTotal}
                        deliveredTotal={deliveredTotal}
                        undeliveredTotal={undeliveredTotal}
                        total={total}
                    />
                </>
            )}
        </div>
    );
}

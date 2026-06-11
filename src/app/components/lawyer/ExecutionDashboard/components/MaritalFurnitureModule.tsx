import React, { useCallback, useMemo, useState } from 'react';
import { CheckCircle, ChevronDown, Pencil, Search, Sofa, X, XCircle } from 'lucide-react';
import type { ExecutionFile } from '@/app/types/execution';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import { MaritalFurnitureSetupSection } from '@/app/components/lawyer/ExecutionCreationView/components/MaritalFurnitureSetupSection';
import { parseMoneyInput } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import {
    countMaritalFurnitureDeliveryStatus,
    createEmptyMaritalFurnitureItem,
    formatMaritalFurnitureIqd,
    furnitureDetailsFromItems,
    isMaritalFurnitureDeliveryStatusRecorded,
    lineTotalIqd,
    normalizeMaritalFurnitureItems,
    readMaritalFurnitureItems,
    sumDeliveredMaritalFurnitureTotal,
    sumMaritalFurnitureTotal,
    sumUndeliveredMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';

export interface MaritalFurnitureModuleProps {
    executionData: ExecutionFile | null | undefined;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    locked?: boolean;
}

const SEARCH_MIN = 10;

function formatCurrency(value: string): string {
    const number = value.replace(/\D/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function DeliveryStatusCell({ row, recorded }: { row: MaritalFurnitureItem; recorded: boolean }) {
    if (!recorded) {
        return (
            <span className="text-[9px] font-bold text-slate-500 text-center block">—</span>
        );
    }
    if (row.delivered === true) {
        return (
            <span
                className="inline-flex items-center justify-center gap-0.5 rounded-lg bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 ring-1 ring-emerald-500/30"
                title="تم التسليم"
            >
                <CheckCircle size={11} />
                مُسلَّم
            </span>
        );
    }
    return (
        <span
            className="inline-flex items-center justify-center gap-0.5 rounded-lg bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 ring-1 ring-rose-500/30"
            title="لم يُسلّم — مرتبط بالمركز المالي"
        >
            <XCircle size={11} />
            غير مُسلَّم
        </span>
    );
}

export const MaritalFurnitureModule: React.FC<MaritalFurnitureModuleProps> = ({
    executionData,
    persistExecutionMerge,
    showToast,
    locked = false,
}) => {
    const [search, setSearch] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [draftItems, setDraftItems] = useState<MaritalFurnitureItem[]>([]);
    const [panelExpanded, setPanelExpanded] = useState(true);

    const items = useMemo(
        () => readMaritalFurnitureItems(executionData as MaritalFurnitureModuleProps['executionData']),
        [executionData]
    );
    const total = useMemo(() => sumMaritalFurnitureTotal(items), [items]);
    const deliveryRecorded = useMemo(
        () => isMaritalFurnitureDeliveryStatusRecorded(executionData),
        [executionData]
    );
    const deliveryCounts = useMemo(() => countMaritalFurnitureDeliveryStatus(items), [items]);
    const deliveredTotal = useMemo(() => sumDeliveredMaritalFurnitureTotal(items), [items]);
    const undeliveredTotal = useMemo(() => sumUndeliveredMaritalFurnitureTotal(items), [items]);

    const visibleItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((row) => row.name.toLowerCase().includes(q));
    }, [items, search]);

    const undeliveredItems = useMemo(
        () => items.filter((row) => row.delivered === false),
        [items]
    );
    const canEditAfterDelivery = deliveryRecorded && undeliveredItems.length > 0;

    const isDeliveredRowLocked = useCallback(
        (row: MaritalFurnitureItem) => deliveryRecorded && row.delivered === true,
        [deliveryRecorded]
    );

    const startEdit = useCallback(() => {
        if (deliveryRecorded && undeliveredItems.length === 0) {
            showToast('جميع القطع مُسلَّمة — لا يمكن التعديل', 'info');
            return;
        }
        setDraftItems(items.length > 0 ? items.map((row) => ({ ...row })) : [createEmptyMaritalFurnitureItem()]);
        setIsEditing(true);
        setPanelExpanded(true);
    }, [items, deliveryRecorded, undeliveredItems.length, showToast]);

    const cancelEdit = useCallback(() => {
        setIsEditing(false);
        setDraftItems([]);
    }, []);

    const handleSave = useCallback(() => {
        const hasDeliveryRecorded = isMaritalFurnitureDeliveryStatusRecorded(executionData);
        const normalized = normalizeMaritalFurnitureItems(draftItems).map((row) => {
            const src = draftItems.find((d) => d.id === row.id);
            if (typeof src?.delivered === 'boolean') {
                return { ...row, delivered: src.delivered };
            }
            return row;
        });
        if (normalized.length === 0) {
            showToast('أضف قطعة واحدة على الأقل باسم صالح', 'warning');
            return;
        }
        if (hasDeliveryRecorded) {
            const missingDelivered = items.filter(
                (row) => row.delivered === true && !normalized.some((n) => n.id === row.id)
            );
            if (missingDelivered.length > 0) {
                showToast('لا يمكن حذف القطع المُسلَّمة', 'warning');
                return;
            }
            for (const row of normalized) {
                if (row.delivered !== true) continue;
                const original = items.find((i) => i.id === row.id);
                if (!original) continue;
                if (
                    row.name !== original.name ||
                    row.quantity !== original.quantity ||
                    row.unitPriceIqd !== original.unitPriceIqd
                ) {
                    showToast('القطع المُسلَّمة مقفلة — التعديل للغير مُسلَّم فقط', 'warning');
                    return;
                }
            }
        }
        const furnitureValue = sumMaritalFurnitureTotal(normalized);
        const financialAmount = hasDeliveryRecorded
            ? sumUndeliveredMaritalFurnitureTotal(normalized)
            : 0;
        persistExecutionMerge({
            maritalFurnitureItems: normalized,
            furnitureValue,
            furnitureDetails: furnitureDetailsFromItems(normalized),
            totalAmount: financialAmount,
            debtAmount: financialAmount,
        });
        setIsEditing(false);
        setDraftItems([]);
        showToast(
            hasDeliveryRecorded ? 'تم حفظ تعديلات غير المُسلَّم' : 'تم حفظ قائمة الأثاث',
            'success'
        );
    }, [draftItems, executionData, items, persistExecutionMerge, showToast]);

    const useScroll = !isEditing && items.length >= 6;
    const editTotal = useMemo(() => sumMaritalFurnitureTotal(draftItems), [draftItems]);

    const togglePanel = () => {
        if (isEditing) return;
        setPanelExpanded((v) => !v);
    };

    const summaryLine = deliveryRecorded
        ? `${deliveryCounts.delivered} مُسلَّم · ${deliveryCounts.undelivered} غير مُسلَّم`
        : `${items.length} قطعة · ${formatMaritalFurnitureIqd(total)} د.ع`;

    return (
        <div className="w-full px-3 py-4 space-y-2">
            <div className="rounded-2xl border border-white/10 bg-black/10 overflow-hidden">
                <div className="flex items-center gap-2 flex-row-reverse px-3 py-3 bg-[#0A1122]/70">
                    <button
                        type="button"
                        onClick={togglePanel}
                        disabled={isEditing}
                        aria-expanded={panelExpanded}
                        className={`flex flex-1 min-w-0 items-center gap-2 flex-row-reverse text-right ${
                            isEditing ? 'cursor-default' : 'hover:opacity-90'
                        }`}
                    >
                        <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#E6C673]/10 shrink-0">
                            <Sofa className="w-5 h-5 text-[#E6C673]/90" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[#E6C673] font-bold text-sm">الأثاث الزوجية</p>
                            {items.length > 0 && !isEditing ? (
                                <p className="text-[10px] text-slate-500 mt-0.5 truncate">{summaryLine}</p>
                            ) : null}
                        </div>
                        {!isEditing ? (
                            <ChevronDown
                                size={18}
                                strokeWidth={2}
                                className={`shrink-0 text-[#D4AF37]/55 transition-transform duration-200 ${
                                    panelExpanded ? 'rotate-180' : ''
                                }`}
                            />
                        ) : null}
                    </button>
                    {!locked ? (
                        isEditing ? (
                            <div className="flex items-center gap-2 flex-row-reverse shrink-0">
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25"
                                >
                                    حفظ
                                </button>
                                <button
                                    type="button"
                                    onClick={cancelEdit}
                                    className="inline-flex items-center gap-1 rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-slate-300 hover:bg-white/10"
                                >
                                    <X size={12} />
                                    إلغاء
                                </button>
                            </div>
                        ) : deliveryRecorded && !canEditAfterDelivery ? null : (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit();
                                }}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-3 py-1.5 text-[11px] font-bold text-[#E6C673] hover:bg-[#E6C673]/20"
                            >
                                <Pencil size={12} />
                                {items.length === 0
                                    ? 'إضافة'
                                    : deliveryRecorded
                                      ? 'تعديل غير المُسلَّم'
                                      : 'تعديل'}
                            </button>
                        )
                    ) : null}
                </div>

                {panelExpanded ? (
                    <div className="border-t border-white/10 p-3">
                        <div className="rounded-3xl border border-[#E6C673]/30 bg-gradient-to-br from-[#E6C673]/12 via-[#0B1120] to-[#0B1120] p-5 space-y-3">
                            {isEditing ? (
                                <>
                                    {deliveryRecorded ? (
                                        <p className="text-[10px] text-amber-300/90 text-right rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                                            القطع المُسلَّمة مقفلة 🔒 — يمكنك تعديل أو حذف غير
                                            المُسلَّم فقط.
                                        </p>
                                    ) : null}
                                    <MaritalFurnitureSetupSection
                                        items={draftItems}
                                        onChange={setDraftItems}
                                        formatCurrency={formatCurrency}
                                        onPriceInput={(e, onParsed) => {
                                            const raw = e.target.value.replace(/[^\d]/g, '');
                                            onParsed(parseMoneyInput(raw));
                                        }}
                                        isRowLocked={isDeliveredRowLocked}
                                        allowAddRows={!deliveryRecorded}
                                    />
                                    <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-4 py-2.5 text-right">
                                        <p className="text-[10px] text-slate-400">المجموع الكلي (قبل الحفظ)</p>
                                        <p className="text-lg font-black text-[#E6C673] font-mono">
                                            {formatMaritalFurnitureIqd(editTotal)}{' '}
                                            <span className="text-xs">د.ع</span>
                                        </p>
                                    </div>
                                </>
                            ) : items.length === 0 ? (
                                <div className="text-right py-2">
                                    <p className="text-xs text-slate-500">لم تُسجَّل قطع الأثاث بعد.</p>
                                </div>
                            ) : (
                                <>
                                    {deliveryRecorded ? (
                                        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 space-y-1 text-[10px]">
                                            <p className="text-emerald-300/90">
                                                مُسلَّم: {deliveryCounts.delivered} قطعة —{' '}
                                                {formatMaritalFurnitureIqd(deliveredTotal)} د.ع
                                            </p>
                                            <p className="text-rose-300/90">
                                                غير مُسلَّم (مركز مالي): {deliveryCounts.undelivered}{' '}
                                                قطعة — {formatMaritalFurnitureIqd(undeliveredTotal)} د.ع
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-amber-300/85 text-right">
                                            حالة التسليم تُحدَّث من بطاقة «تسليم أثاث» في الإجراءات
                                            الجبرية بعد جرد التسليم.
                                        </p>
                                    )}

                                    {items.length >= SEARCH_MIN ? (
                                        <div className="relative">
                                            <Search
                                                size={14}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                                            />
                                            <input
                                                type="search"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                                placeholder="بحث في قائمة الأثاث…"
                                                className="w-full bg-black/30 border border-white/10 text-white text-sm pr-9 pl-3 py-2 rounded-xl focus:border-[#E6C673]/40 outline-none text-right"
                                            />
                                        </div>
                                    ) : null}

                                    <div
                                        className={`overflow-hidden rounded-2xl border border-white/10 ${
                                            useScroll
                                                ? 'max-h-[min(50vh,340px)] overflow-y-auto overscroll-contain'
                                                : ''
                                        }`}
                                    >
                                        <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1.2fr)_0.4fr_0.65fr_0.7fr_0.85fr] gap-1.5 px-3 py-2 bg-[#0A0F1C]/95 border-b border-white/10 text-[10px] font-bold text-slate-400 text-right backdrop-blur-sm">
                                            <span>اسم الأثاث</span>
                                            <span>العدد</span>
                                            <span>السعر</span>
                                            <span>الإجمالي</span>
                                            <span className="text-center">التسليم</span>
                                        </div>
                                        {visibleItems.length === 0 ? (
                                            <p className="px-3 py-5 text-center text-xs text-slate-500">
                                                لا توجد نتائج
                                            </p>
                                        ) : (
                                            visibleItems.map((row: MaritalFurnitureItem) => (
                                                <div
                                                    key={row.id}
                                                    className="grid grid-cols-[minmax(0,1.2fr)_0.4fr_0.65fr_0.7fr_0.85fr] gap-1.5 px-3 py-2 border-b border-white/5 text-right text-sm even:bg-white/[0.015] items-center"
                                                >
                                                    <span className="font-bold text-white truncate text-xs">
                                                        {row.name}
                                                    </span>
                                                    <span className="text-slate-300 font-mono text-xs">
                                                        {row.quantity}
                                                    </span>
                                                    <span className="text-slate-300 font-mono text-[11px]">
                                                        {formatMaritalFurnitureIqd(row.unitPriceIqd)}
                                                    </span>
                                                    <span className="text-[#E6C673] font-bold font-mono text-[11px]">
                                                        {formatMaritalFurnitureIqd(lineTotalIqd(row))}
                                                    </span>
                                                    <div className="flex justify-center">
                                                        <DeliveryStatusCell
                                                            row={row}
                                                            recorded={deliveryRecorded}
                                                        />
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-4 py-2.5 text-right space-y-1">
                                        <p className="text-[10px] text-slate-400">المجموع الكلي للقائمة</p>
                                        <p className="text-lg font-black text-[#E6C673] font-mono">
                                            {formatMaritalFurnitureIqd(total)}{' '}
                                            <span className="text-xs">د.ع</span>
                                        </p>
                                        {deliveryRecorded ? (
                                            <p className="text-[10px] text-rose-300/90 pt-1 border-t border-white/5">
                                                المتبقي في المركز المالي:{' '}
                                                <span className="font-bold font-mono">
                                                    {formatMaritalFurnitureIqd(undeliveredTotal)} د.ع
                                                </span>
                                            </p>
                                        ) : null}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

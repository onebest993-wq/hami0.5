import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Sofa, Truck, XCircle } from '@/app/components/ui/lucideIcons';
import type { MaritalFurnitureItem, MaritalFurnitureDeliveryOutcome } from '@/app/types/maritalFurniture';
import {
    areAllMaritalFurnitureItemsDeliveryLocked,
    formatMaritalFurnitureIqd,
    isMaritalFurnitureItemDeliveryLocked,
    lineTotalIqd,
    applyMaritalFurnitureDeliveryOutcome,

    resolveMaritalFurnitureDeliveryOutcome,
    sumDeliveredMaritalFurnitureTotal,
    sumMaritalFurnitureTotal,
    sumUndeliveredMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';

export interface MaritalFurnitureDeliveryInventoryFormProps {
    items: MaritalFurnitureItem[];
    disabled?: boolean;
    ledgerSaved?: boolean;
    scheduleYmd?: string;
    /** مقفول حتى تاريخ الموعد المحدد */
    scheduleLocked?: boolean;
    scheduleLabel?: string;
    onRequestEarlyDelivery?: () => void;
    onSave?: (items: MaritalFurnitureItem[]) => void;
    onFinalize?: () => void;
    onItemDeliveryOutcome?: (input: {
        itemId: string;
        outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>;
    }) => void;
}

function OutcomeBadge({ outcome }: { outcome: MaritalFurnitureDeliveryOutcome }) {
    if (outcome === 'delivered') {
        return (
            <span className="inline-flex items-center gap-0.5 rounded-lg bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                <CheckCircle size={11} />
                مُسلَّم
            </span>
        );
    }
    if (outcome === 'external_delivered') {
        return (
            <span className="inline-flex items-center gap-0.5 rounded-lg bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold text-sky-300 ring-1 ring-sky-500/30">
                <Truck size={11} />
                تسليم خارجي
            </span>
        );
    }
    if (outcome === 'failed') {
        return (
            <span className="inline-flex items-center gap-0.5 rounded-lg bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 ring-1 ring-rose-500/30">
                <XCircle size={11} />
                تعذّر
            </span>
        );
    }
    return <span className="text-[9px] font-bold text-slate-500">—</span>;
}

export const MaritalFurnitureDeliveryInventoryForm: React.FC<
    MaritalFurnitureDeliveryInventoryFormProps
> = ({
    items,
    disabled = false,
    ledgerSaved = false,
    scheduleYmd = '',
    scheduleLocked = false,
    scheduleLabel = '',
    onRequestEarlyDelivery,
    onSave,
    onFinalize,
    onItemDeliveryOutcome,
}) => {
    const [rows, setRows] = useState<MaritalFurnitureItem[]>(() => items.map((row) => ({ ...row })));

    useEffect(() => {
        setRows(items.map((row) => ({ ...row })));
    }, [items]);

    const perItemMode = typeof onItemDeliveryOutcome === 'function';
    const listTotal = useMemo(() => sumMaritalFurnitureTotal(rows), [rows]);
    const undeliveredTotal = useMemo(() => sumUndeliveredMaritalFurnitureTotal(rows), [rows]);
    const deliveredTotal = useMemo(() => sumDeliveredMaritalFurnitureTotal(rows), [rows]);
    const allLocked = useMemo(() => areAllMaritalFurnitureItemsDeliveryLocked(rows), [rows]);

    const handleLegacySave = () => {
        if (!onSave || disabled || rows.length === 0 || scheduleLocked) return;
        onSave(rows.map((row) => ({ ...row, delivered: row.delivered === true })));
    };

    const handleFinalize = () => {
        if (disabled || !onFinalize) return;
        if (
            !window.confirm('هل تأكدت من اكتمال جرد التسليم وإغلاق طلب كسر الأقفال والجرد؟')
        ) {
            return;
        }
        onFinalize();
    };

    const confirmOutcome = (
        item: MaritalFurnitureItem,
        outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>,
    ) => {
        const labels: Record<typeof outcome, string> = {
            delivered: `تأكيد تسليم «${item.name}»؟`,
            failed: `تأكيد تعذّر تسليم «${item.name}» وربطها بالمركز المالي؟`,
            external_delivered: `تأكيد التسليم الخارجي لـ «${item.name}» قبل الموعد؟`,
        };
        if (!window.confirm(labels[outcome])) return;
        if (perItemMode) {
            const ts = new Date().toISOString();
            setRows((prev) =>
                prev.map((row) =>
                    row.id === item.id
                        ? applyMaritalFurnitureDeliveryOutcome(row, outcome, ts)
                        : row,
                ),
            );
        }
        onItemDeliveryOutcome?.({ itemId: item.id, outcome });
    };

    if (items.length === 0) {
        return (
            <div
                className="rounded-2xl border border-[#E6C673]/25 bg-[#E6C673]/5 px-4 py-3 text-right"
                dir="rtl"
            >
                <p className="text-[11px] text-slate-400">
                    لا توجد قطع أثاث مسجّلة — أضف القائمة من قسم «الأثاث الزوجية» في لوحة التنفيذ أولاً.
                </p>
            </div>
        );
    }

    const beforeSchedule = Boolean(scheduleYmd) && scheduleLocked;

    return (
        <div className="relative">
            {beforeSchedule ? (
                <div
                    className="mb-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-right"
                    dir="rtl"
                >
                    <p className="text-[10px] font-bold text-amber-200">قبل موعد التسليم</p>
                    {scheduleLabel ? (
                        <p className="text-[10px] text-slate-300 mt-0.5">{scheduleLabel}</p>
                    ) : null}
                    {onRequestEarlyDelivery ? (
                        <button
                            type="button"
                            onClick={onRequestEarlyDelivery}
                            className="mt-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold text-amber-100 hover:bg-amber-500/20"
                        >
                            فتح التسليم المبكر (استثناء)
                        </button>
                    ) : null}
                </div>
            ) : scheduleLabel ? (
                <p className="text-[10px] text-emerald-300/90 text-right mb-2">{scheduleLabel}</p>
            ) : null}

            <div
                className="rounded-3xl border border-[#E6C673]/30 bg-gradient-to-br from-[#E6C673]/12 via-[#0B1120] to-[#0B1120] p-4 space-y-3 text-right"
                dir="rtl"
            >
                <div className="flex items-center justify-between gap-2 flex-row-reverse">
                    <p className="text-[10px] text-slate-500">
                        {rows.length} قطعة · {formatMaritalFurnitureIqd(listTotal)} د.ع
                    </p>
                    <Sofa size={16} className="text-[#E6C673]/85 shrink-0" />
                </div>

                <p className="text-[10px] text-slate-400">
                    {beforeSchedule
                        ? 'قبل الموعد: «تسليم خارجي» فقط. بعد الموعد: «تسليم» أو «تعذّر التسليم».'
                        : 'حدّد حالة كل قطعة — يُقفل الخيار بعد التسجيل.'}
                </p>

                <div className="overflow-hidden rounded-2xl border border-white/10 max-h-[min(40vh,240px)] overflow-y-auto overscroll-contain">
                    <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1.2fr)_0.4fr_0.65fr_0.7fr_1fr] gap-1.5 px-3 py-2 bg-[#0A0F1C]/95 border-b border-white/10 text-[10px] font-bold text-slate-400 backdrop-blur-sm">
                        <span>اسم الأثاث</span>
                        <span>العدد</span>
                        <span>السعر</span>
                        <span>الإجمالي</span>
                        <span className="text-center">التسليم</span>
                    </div>
                    {rows.map((row) => {
                        const outcome = resolveMaritalFurnitureDeliveryOutcome(row);
                        const locked = isMaritalFurnitureItemDeliveryLocked(row) || ledgerSaved;
                        return (
                            <div
                                key={row.id}
                                className="grid grid-cols-[minmax(0,1.2fr)_0.4fr_0.65fr_0.7fr_1fr] gap-1.5 px-3 py-2 border-b border-white/5 text-right text-sm even:bg-white/[0.015] items-center"
                            >
                                <span className="font-bold text-white truncate text-xs">{row.name}</span>
                                <span className="text-slate-300 font-mono text-xs">{row.quantity}</span>
                                <span className="text-slate-300 font-mono text-[11px]">
                                    {formatMaritalFurnitureIqd(row.unitPriceIqd)}
                                </span>
                                <span className="text-[#E6C673] font-bold font-mono text-[11px]">
                                    {formatMaritalFurnitureIqd(lineTotalIqd(row))}
                                </span>
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                    {locked || !perItemMode ? (
                                        <OutcomeBadge outcome={outcome} />
                                    ) : beforeSchedule ? (
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => confirmOutcome(row, 'external_delivered')}
                                            className="rounded-lg border border-sky-500/35 bg-sky-500/10 px-2 py-1 text-[9px] font-bold text-sky-200 hover:bg-sky-500/20 disabled:opacity-40"
                                        >
                                            تسليم خارجي
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => confirmOutcome(row, 'delivered')}
                                                className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-40"
                                            >
                                                تسليم
                                            </button>
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                onClick={() => confirmOutcome(row, 'failed')}
                                                className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-2 py-1 text-[9px] font-bold text-rose-200 hover:bg-rose-500/20 disabled:opacity-40"
                                            >
                                                تعذّر التسليم
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-3 py-2.5 space-y-1 text-[10px]">
                    <p className="text-emerald-300/90">
                        مُسلَّم: {formatMaritalFurnitureIqd(deliveredTotal)} د.ع
                    </p>
                    <p className="text-rose-300/90">
                        غير مُسلَّم (مركز مالي): {formatMaritalFurnitureIqd(undeliveredTotal)} د.ع
                    </p>
                </div>

                {!perItemMode && onSave && !ledgerSaved ? (
                    <button
                        type="button"
                        disabled={disabled || scheduleLocked}
                        onClick={handleLegacySave}
                        className="w-full rounded-xl bg-gradient-to-l from-[#E6C673] to-amber-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                    >
                        حفظ حالة التسليم
                    </button>
                ) : null}

                {perItemMode && allLocked && onFinalize ? (
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={handleFinalize}
                        className="w-full rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 disabled:opacity-40"
                    >
                        تأكيد اكتمال الكسر والجرد
                    </button>
                ) : null}
            </div>
        </div>
    );
};


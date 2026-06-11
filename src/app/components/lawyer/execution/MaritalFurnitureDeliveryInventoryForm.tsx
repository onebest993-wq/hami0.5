import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Sofa, XCircle } from 'lucide-react';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    formatMaritalFurnitureIqd,
    lineTotalIqd,
    sumDeliveredMaritalFurnitureTotal,
    sumMaritalFurnitureTotal,
    sumUndeliveredMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';

export interface MaritalFurnitureDeliveryInventoryFormProps {
    items: MaritalFurnitureItem[];
    disabled?: boolean;
    ledgerSaved?: boolean;
    /** مقفول حتى تاريخ الموعد المحدد */
    scheduleLocked?: boolean;
    scheduleLabel?: string;
    onRequestEarlyDelivery?: () => void;
    onSave: (items: MaritalFurnitureItem[]) => void;
    onFinalize: () => void;
}

export const MaritalFurnitureDeliveryInventoryForm: React.FC<
    MaritalFurnitureDeliveryInventoryFormProps
> = ({
    items,
    disabled = false,
    ledgerSaved = false,
    scheduleLocked = false,
    scheduleLabel = '',
    onRequestEarlyDelivery,
    onSave,
    onFinalize,
}) => {
    const [rows, setRows] = useState<MaritalFurnitureItem[]>(() =>
        items.map((row) => ({ ...row, delivered: row.delivered === true }))
    );
    const [saved, setSaved] = useState(ledgerSaved);

    useEffect(() => {
        setRows(items.map((row) => ({ ...row, delivered: row.delivered === true })));
        setSaved(ledgerSaved);
    }, [items, ledgerSaved]);

    const listTotal = useMemo(() => sumMaritalFurnitureTotal(rows), [rows]);
    const undeliveredTotal = useMemo(() => sumUndeliveredMaritalFurnitureTotal(rows), [rows]);
    const deliveredTotal = useMemo(() => sumDeliveredMaritalFurnitureTotal(rows), [rows]);
    const deliveredCount = useMemo(() => rows.filter((r) => r.delivered).length, [rows]);
    const undeliveredCount = rows.length - deliveredCount;

    const setDelivered = (id: string, delivered: boolean) => {
        if (disabled || saved || scheduleLocked) return;
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, delivered } : row)));
    };

    const handleSave = () => {
        if (disabled || rows.length === 0 || scheduleLocked) return;
        const msg = [
            'تأكيد حفظ حالة تسليم الأثاث:',
            `• مُسلَّم: ${deliveredCount} قطعة (${formatMaritalFurnitureIqd(deliveredTotal)} د.ع — يُزال من المركز المالي)`,
            `• غير مُسلَّم: ${undeliveredCount} قطعة (${formatMaritalFurnitureIqd(undeliveredTotal)} د.ع — يُربط بالمركز المالي)`,
            '',
            'هل تريد حفظ الحالة؟',
        ].join('\n');
        if (!window.confirm(msg)) return;
        onSave(rows.map((row) => ({ ...row, delivered: row.delivered === true })));
        setSaved(true);
    };

    const handleFinalize = () => {
        if (disabled) return;
        if (
            !window.confirm(
                'هل تأكدت من اكتمال جرد التسليم وإغلاق طلب كسر الأقفال والجرد؟'
            )
        ) {
            return;
        }
        onFinalize();
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

    return (
        <div className="relative">
            {scheduleLocked ? (
                <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-3xl bg-slate-950/80 px-4 py-6 text-center backdrop-blur-sm"
                    dir="rtl"
                >
                    <p className="text-[11px] font-bold text-amber-200">جرد التسليم مقفول حتى موعد التسليم</p>
                    {scheduleLabel ? (
                        <p className="text-[10px] text-slate-300 leading-relaxed">{scheduleLabel}</p>
                    ) : null}
                    {onRequestEarlyDelivery ? (
                        <button
                            type="button"
                            onClick={onRequestEarlyDelivery}
                            className="mt-1 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold text-amber-100 hover:bg-amber-500/20"
                        >
                            تسليم مبكر (استثناء)
                        </button>
                    ) : null}
                </div>
            ) : null}
            <div
                className={`rounded-3xl border border-[#E6C673]/30 bg-gradient-to-br from-[#E6C673]/12 via-[#0B1120] to-[#0B1120] p-4 space-y-3 text-right ${
                    scheduleLocked ? 'pointer-events-none select-none opacity-45' : ''
                }`}
                dir="rtl"
            >
            <div className="flex items-center justify-between gap-2 flex-row-reverse">
                <p className="text-[10px] text-slate-500">
                    {rows.length} قطعة · {formatMaritalFurnitureIqd(listTotal)} د.ع
                </p>
                <Sofa size={16} className="text-[#E6C673]/85 shrink-0" />
            </div>

            <p className="text-[10px] text-slate-400">
                حدّد حالة تسليم كل قطعة:{' '}
                <span className="text-emerald-400">أخضر = تم التسليم</span>
                {' · '}
                <span className="text-rose-400">أحمر = لم يُسلّم (مالي)</span>
            </p>

            <div className="overflow-hidden rounded-2xl border border-white/10 max-h-[min(40vh,240px)] overflow-y-auto overscroll-contain">
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1.2fr)_0.4fr_0.65fr_0.7fr_0.75fr] gap-1.5 px-3 py-2 bg-[#0A0F1C]/95 border-b border-white/10 text-[10px] font-bold text-slate-400 backdrop-blur-sm">
                    <span>اسم الأثاث</span>
                    <span>العدد</span>
                    <span>السعر</span>
                    <span>الإجمالي</span>
                    <span className="text-center">التسليم</span>
                </div>
                {rows.map((row) => {
                    const delivered = row.delivered === true;
                    return (
                        <div
                            key={row.id}
                            className="grid grid-cols-[minmax(0,1.2fr)_0.4fr_0.65fr_0.7fr_0.75fr] gap-1.5 px-3 py-2 border-b border-white/5 text-right text-sm even:bg-white/[0.015] items-center"
                        >
                            <span className="font-bold text-white truncate text-xs">{row.name}</span>
                            <span className="text-slate-300 font-mono text-xs">{row.quantity}</span>
                            <span className="text-slate-300 font-mono text-[11px]">
                                {formatMaritalFurnitureIqd(row.unitPriceIqd)}
                            </span>
                            <span className="text-[#E6C673] font-bold font-mono text-[11px]">
                                {formatMaritalFurnitureIqd(lineTotalIqd(row))}
                            </span>
                            <div className="flex items-center justify-center gap-1">
                                <button
                                    type="button"
                                    disabled={disabled || saved}
                                    title="تم التسليم"
                                    onClick={() => setDelivered(row.id, true)}
                                    className={`rounded-lg p-1 transition ${
                                        delivered
                                            ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                                            : 'text-slate-500 hover:bg-white/5'
                                    } disabled:opacity-40`}
                                >
                                    <CheckCircle size={14} />
                                </button>
                                <button
                                    type="button"
                                    disabled={disabled || saved}
                                    title="لم يُسلّم"
                                    onClick={() => setDelivered(row.id, false)}
                                    className={`rounded-lg p-1 transition ${
                                        !delivered
                                            ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40'
                                            : 'text-slate-500 hover:bg-white/5'
                                    } disabled:opacity-40`}
                                >
                                    <XCircle size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/8 px-3 py-2.5 space-y-1 text-[10px]">
                <p className="text-emerald-300/90">
                    مُسلَّم: {deliveredCount} — {formatMaritalFurnitureIqd(deliveredTotal)} د.ع
                </p>
                <p className="text-rose-300/90">
                    غير مُسلَّم (مركز مالي): {undeliveredCount} —{' '}
                    {formatMaritalFurnitureIqd(undeliveredTotal)} د.ع
                </p>
            </div>

            {!saved ? (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={handleSave}
                    className="w-full rounded-xl bg-gradient-to-l from-[#E6C673] to-amber-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                >
                    حفظ حالة التسليم
                </button>
            ) : (
                <p className="text-[10px] text-emerald-300/90 text-center">
                    تم حفظ حالة التسليم وتحديث المركز المالي.
                </p>
            )}

            {saved ? (
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

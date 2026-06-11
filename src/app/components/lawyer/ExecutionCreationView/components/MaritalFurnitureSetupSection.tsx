import React, { useMemo, useState } from 'react';
import { Plus, Search, Sofa, Trash2 } from 'lucide-react';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    createEmptyMaritalFurnitureItem,
    formatMaritalFurnitureIqd,
    lineTotalIqd,
    normalizeMaritalFurnitureItems,
    sumMaritalFurnitureTotal,
} from '@/app/utils/maritalFurniture';
import { ecg } from './executionCreationGlassUi';

export interface MaritalFurnitureSetupSectionProps {
    items: MaritalFurnitureItem[];
    onChange: (items: MaritalFurnitureItem[]) => void;
    formatCurrency: (value: string) => string;
    onPriceInput: (
        e: React.ChangeEvent<HTMLInputElement>,
        onParsed: (amount: number) => void
    ) => void;
    /** قفل سطر (مثلاً المُسلَّم بعد جرد التسليم) */
    isRowLocked?: (row: MaritalFurnitureItem) => boolean;
    /** السماح بإضافة أسطر جديدة — يُعطَّل بعد جرد التسليم */
    allowAddRows?: boolean;
}

const SEARCH_MIN_ROWS = 8;
const SCROLL_MIN_ROWS = 5;

const cellInput = `${ecg.fieldSm} min-w-0 py-1.5`;

export const MaritalFurnitureSetupSection: React.FC<MaritalFurnitureSetupSectionProps> = ({
    items,
    onChange,
    formatCurrency,
    onPriceInput,
    isRowLocked,
    allowAddRows = true,
}) => {
    const [search, setSearch] = useState('');

    const namedCount = useMemo(
        () => normalizeMaritalFurnitureItems(items).length,
        [items]
    );
    const total = useMemo(() => sumMaritalFurnitureTotal(items), [items]);

    const visibleItems = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return items;
        return items.filter((row) => row.name.toLowerCase().includes(q));
    }, [items, search]);

    const patchRow = (id: string, patch: Partial<MaritalFurnitureItem>) => {
        const row = items.find((r) => r.id === id);
        if (row && isRowLocked?.(row)) return;
        onChange(items.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    };

    const addRow = () => {
        onChange([...items, createEmptyMaritalFurnitureItem()]);
    };

    const removeRow = (id: string) => {
        const row = items.find((r) => r.id === id);
        if (row && isRowLocked?.(row)) return;
        if (items.length <= 1) {
            onChange([createEmptyMaritalFurnitureItem()]);
            return;
        }
        onChange(items.filter((row) => row.id !== id));
    };

    const useScroll = items.length >= SCROLL_MIN_ROWS;

    return (
        <div className={`${ecg.subCard} animate-fade-in space-y-3`}>
            <div className="flex items-start justify-between gap-3 flex-row-reverse">
                <div className="text-right min-w-0 flex-1">
                    <p className="text-sm font-bold text-[#E6C673]">قائمة الأثاث المحكوم بها</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                        جدول مضغوط — مناسب لقوائم طويلة (٢٠+ قطعة)
                    </p>
                </div>
                <Sofa size={20} className="text-[#E6C673]/80 shrink-0 mt-0.5" />
            </div>

            <div className="rounded-xl border border-[#E6C673]/20 bg-[#E6C673]/6 px-3 py-2 flex flex-wrap items-center justify-between gap-2 flex-row-reverse text-right">
                <p className="text-[11px] text-slate-300">
                    <span className="text-[#E6C673] font-bold">{items.length}</span> سطر
                    {namedCount > 0 ? (
                        <>
                            {' '}
                            · <span className="text-emerald-300/90 font-bold">{namedCount}</span> مسمّى
                        </>
                    ) : null}
                </p>
                <p className="text-xs font-black text-[#E6C673] font-mono">
                    {formatMaritalFurnitureIqd(total)} <span className="text-[10px] font-bold">د.ع</span>
                </p>
            </div>

            {items.length >= SEARCH_MIN_ROWS ? (
                <div className="relative">
                    <Search
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
                    />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="بحث سريع في القائمة…"
                        className={`${cellInput} pr-9 py-2 text-sm`}
                    />
                </div>
            ) : null}

            <div
                className={`rounded-xl border border-white/10 overflow-hidden ${
                    useScroll ? 'max-h-[min(42vh,300px)] overflow-y-auto overscroll-contain' : ''
                }`}
            >
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_52px_88px_72px_32px] gap-1.5 px-2 py-2 bg-[#0A0F1C]/95 border-b border-white/10 text-[9px] font-bold text-slate-500 text-right backdrop-blur-sm">
                    <span>الاسم</span>
                    <span className="text-center">العدد</span>
                    <span>السعر</span>
                    <span>الإجمالي</span>
                    <span />
                </div>

                {visibleItems.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-slate-500">لا توجد نتائج للبحث</p>
                ) : (
                    visibleItems.map((row) => {
                        const locked = isRowLocked?.(row) ?? false;
                        return (
                        <div
                            key={row.id}
                            className={`grid grid-cols-[minmax(0,1fr)_52px_88px_72px_32px] gap-1.5 px-2 py-1.5 border-b border-white/5 items-center ${
                                locked ? 'bg-emerald-500/[0.04] opacity-90' : 'hover:bg-white/[0.02]'
                            }`}
                        >
                            {locked ? (
                                <>
                                    <span className="text-xs font-bold text-slate-300 truncate text-right px-1">
                                        {row.name}
                                    </span>
                                    <span className="text-center text-xs text-slate-400 font-mono">
                                        {row.quantity}
                                    </span>
                                    <span className="text-xs text-slate-400 font-mono truncate">
                                        {formatMaritalFurnitureIqd(row.unitPriceIqd)}
                                    </span>
                                    <span className="text-[10px] font-bold text-emerald-300/80 font-mono text-left truncate">
                                        {formatMaritalFurnitureIqd(lineTotalIqd(row))}
                                    </span>
                                    <span
                                        className="text-[8px] font-bold text-emerald-400/70 text-center leading-tight"
                                        title="مُقفل — تم التسليم"
                                    >
                                        🔒
                                    </span>
                                </>
                            ) : (
                                <>
                            <input
                                type="text"
                                value={row.name}
                                onChange={(e) => patchRow(row.id, { name: e.target.value })}
                                className={cellInput}
                                placeholder="اسم القطعة"
                            />
                            <input
                                type="number"
                                min={1}
                                value={row.quantity}
                                onChange={(e) =>
                                    patchRow(row.id, {
                                        quantity: Math.max(1, Number(e.target.value) || 1),
                                    })
                                }
                                className={`${cellInput} text-center font-mono`}
                            />
                            <input
                                type="text"
                                inputMode="numeric"
                                value={formatCurrency(String(row.unitPriceIqd || ''))}
                                onChange={(e) =>
                                    onPriceInput(e, (amount) =>
                                        patchRow(row.id, { unitPriceIqd: amount })
                                    )
                                }
                                className={`${cellInput} font-mono`}
                                placeholder="0"
                            />
                            <span className="text-[10px] font-bold text-[#E6C673]/90 font-mono text-left truncate">
                                {formatMaritalFurnitureIqd(lineTotalIqd(row))}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeRow(row.id)}
                                className="flex items-center justify-center p-1 rounded-md text-rose-300/70 hover:bg-rose-500/10 hover:text-rose-200"
                                aria-label="حذف"
                            >
                                <Trash2 size={13} />
                            </button>
                                </>
                            )}
                        </div>
                        );
                    })
                )}
            </div>

            {useScroll ? (
                <p className="text-[9px] text-slate-600 text-right">مرّر داخل الجدول لعرض بقية القطع</p>
            ) : null}

            {allowAddRows ? (
            <button type="button" onClick={addRow} className={`${ecg.addBtn} !mt-0 border-dashed`}>
                <Plus size={15} />
                إضافة سطر
            </button>
            ) : null}
        </div>
    );
};

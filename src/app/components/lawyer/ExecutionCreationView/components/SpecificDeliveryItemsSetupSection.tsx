import React from 'react';
import { AlertTriangle, Building2, Package, Plus, Trash2 } from 'lucide-react';
import type { SpecificDeliveryItemNature } from '@/app/utils/executionModuleStrategies';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';
import {
    createEmptySpecificDeliveryItem,
    normalizeSpecificDeliveryItemsForSave,
} from '@/app/utils/specificDeliveryItemsUtils';
import {
    formatMoneyIntegerDisplay,
    handleMoneyInputChange,
} from '@/app/utils/moneyInput';
import { ecg } from './executionCreationGlassUi';

export interface SpecificDeliveryItemsSetupSectionProps {
    items: SpecificDeliveryItem[];
    onChange: (items: SpecificDeliveryItem[]) => void;
}

const natureMeta = {
    movable: {
        label: 'منقول',
        hint: 'سيارة، آلة…',
        Icon: Package,
        inputPlaceholder: 'وصف الشيء المنقول',
    },
    immovable: {
        label: 'غير منقول',
        hint: 'عقار، أرض…',
        Icon: Building2,
        inputPlaceholder: 'رقم العقار',
    },
} as const;

function countByNature(items: SpecificDeliveryItem[]) {
    let movable = 0;
    let immovable = 0;
    let destroyed = 0;
    for (const row of normalizeSpecificDeliveryItemsForSave(items)) {
        if (row.nature === 'movable') movable += 1;
        else immovable += 1;
        if (row.declaredDestroyed) destroyed += 1;
    }
    return { movable, immovable, destroyed, total: movable + immovable };
}

function AddNatureButton({
    nature,
    onClick,
    compact = false,
}: {
    nature: SpecificDeliveryItemNature;
    onClick: () => void;
    compact?: boolean;
}) {
    const { label, hint, Icon } = natureMeta[nature];
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex flex-1 flex-row-reverse items-center justify-center gap-2 rounded-xl border border-dashed transition-all ${
                compact
                    ? 'border-[#E6C673]/28 bg-[#E6C673]/5 px-3 py-2 text-[11px] font-bold text-[#E6C673]/95 hover:bg-[#E6C673]/10'
                    : 'border-white/15 bg-white/[0.02] px-4 py-3 hover:border-[#E6C673]/30 hover:bg-[#E6C673]/6'
            }`}
        >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="flex flex-col items-end gap-0.5 text-right">
                <span className="inline-flex items-center gap-1.5 font-bold text-[#E6C673]">
                    <Icon className="h-3.5 w-3.5" />
                    إضافة {label}
                </span>
                {!compact ? (
                    <span className="text-[9px] font-normal text-slate-500">{hint}</span>
                ) : null}
            </span>
        </button>
    );
}

function NatureBadge({ nature }: { nature: SpecificDeliveryItemNature }) {
    const { label, Icon } = natureMeta[nature];
    return (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#E6C673]/25 bg-[#E6C673]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#F5E6B8]">
            <Icon className="h-3 w-3 shrink-0" />
            {label}
        </span>
    );
}

export const SpecificDeliveryItemsSetupSection: React.FC<SpecificDeliveryItemsSetupSectionProps> = ({
    items,
    onChange,
}) => {
    const rows = items.length > 0 ? items : [];
    const counts = countByNature(rows);

    const patchRow = (id: string, patch: Partial<SpecificDeliveryItem>) => {
        onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    };

    const addRow = (nature: SpecificDeliveryItemNature) => {
        onChange([...rows, createEmptySpecificDeliveryItem(nature)]);
    };

    const removeRow = (id: string) => {
        if (rows.length <= 1) {
            onChange([]);
            return;
        }
        onChange(rows.filter((row) => row.id !== id));
    };

    return (
        <div className={`${ecg.subCard} space-y-4`}>
            <div className="text-right">
                <p className="text-sm font-bold text-[#E6C673]">تسليم شيء معين</p>
            </div>

            {counts.total > 0 ? (
                <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-[#E6C673]/15 bg-[#E6C673]/5 px-3 py-2 text-[10px]">
                    {counts.movable > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-300">
                            <Package className="h-3 w-3 text-[#E6C673]/80" />
                            {counts.movable} منقول
                        </span>
                    ) : null}
                    {counts.movable > 0 && counts.immovable > 0 ? (
                        <span className="text-slate-600">·</span>
                    ) : null}
                    {counts.immovable > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-300">
                            <Building2 className="h-3 w-3 text-[#E6C673]/80" />
                            {counts.immovable} غير منقول
                        </span>
                    ) : null}
                    {counts.destroyed > 0 ? (
                        <>
                            {(counts.movable > 0 || counts.immovable > 0) ? (
                                <span className="text-slate-600">·</span>
                            ) : null}
                            <span className="inline-flex items-center gap-1 font-bold text-amber-200/90">
                                <AlertTriangle className="h-3 w-3" />
                                {counts.destroyed} هالك
                            </span>
                        </>
                    ) : null}
                </div>
            ) : null}

            {rows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/12 bg-black/15 px-4 py-5 text-center space-y-3">
                    <div className="flex flex-col sm:flex-row-reverse gap-2">
                        <AddNatureButton nature="movable" onClick={() => addRow('movable')} />
                        <AddNatureButton nature="immovable" onClick={() => addRow('immovable')} />
                    </div>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {rows.map((row, index) => (
                        <div
                            key={row.id}
                            className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2.5"
                        >
                            <div className="flex flex-row-reverse items-center justify-between gap-2">
                                <NatureBadge nature={row.nature} />
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500">
                                        {index + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeRow(row.id)}
                                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                                        aria-label={`حذف الشيء ${index + 1}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                            <input
                                type="text"
                                value={row.name}
                                onChange={(e) => patchRow(row.id, { name: e.target.value })}
                                placeholder={natureMeta[row.nature].inputPlaceholder}
                                className={ecg.field}
                                dir="rtl"
                            />
                            <div className="flex flex-row-reverse items-center justify-between gap-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        patchRow(row.id, {
                                            declaredDestroyed: !row.declaredDestroyed,
                                            ...(row.declaredDestroyed
                                                ? { judgmentValueIqd: undefined }
                                                : {}),
                                        })
                                    }
                                    className={`rounded-xl border px-3 py-2 text-[10px] font-bold transition-all ${
                                        row.declaredDestroyed
                                            ? 'border-amber-500/45 bg-amber-500/15 text-amber-100'
                                            : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-amber-500/30 hover:text-amber-200/90'
                                    }`}
                                >
                                    {row.declaredDestroyed ? '✓ هالك — تحويل مالي' : 'هالك / تعذّر التسليم'}
                                </button>
                            </div>
                            {row.declaredDestroyed ? (
                                <>
                                    <div className={ecg.moneyWrap}>
                                        <span className="text-[10px] font-bold text-amber-200/90 shrink-0">
                                            القيمة المحكوم بها
                                        </span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            value={formatMoneyIntegerDisplay(
                                                String(row.judgmentValueIqd || '')
                                            )}
                                            onChange={(e) =>
                                                handleMoneyInputChange(e.target.value, (raw) => {
                                                    const n = Math.max(
                                                        0,
                                                        Math.trunc(Number(raw.replace(/[^\d]/g, '')) || 0)
                                                    );
                                                    patchRow(row.id, { judgmentValueIqd: n || undefined });
                                                })
                                            }
                                            placeholder="0"
                                            dir="ltr"
                                            className={ecg.moneyInput}
                                        />
                                        <span className="text-[10px] text-slate-500 shrink-0">د.ع</span>
                                    </div>
                                    <p className="text-[9px] text-slate-500 text-right leading-relaxed">
                                        يُسجَّل في المركز المالي كإجمالي دين عند حفظ الإضبارة
                                    </p>
                                </>
                            ) : null}
                        </div>
                    ))}
                </div>
            )}

            {rows.length > 0 ? (
                <div className="flex flex-col sm:flex-row-reverse gap-2 pt-1">
                    <AddNatureButton nature="movable" onClick={() => addRow('movable')} compact />
                    <AddNatureButton nature="immovable" onClick={() => addRow('immovable')} compact />
                </div>
            ) : null}
        </div>
    );
};

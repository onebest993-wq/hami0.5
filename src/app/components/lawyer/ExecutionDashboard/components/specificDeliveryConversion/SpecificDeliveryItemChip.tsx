import React from 'react';
import { Building2 } from '@/app/components/ui/icons/Building2';
import { Package } from '@/app/components/ui/icons/Package';
import type { SpecificDeliveryItem } from '@/app/utils/specificDeliveryItemsUtils';

export function SpecificDeliveryItemChip({
    item,
    selected,
    onSelect,
}: {
    item: SpecificDeliveryItem;
    selected: boolean;
    onSelect: () => void;
}) {
    const isImmovable = item.nature === 'immovable';
    const Icon = isImmovable ? Building2 : Package;
    const name = String(item.name || '').trim() || '—';

    return (
        <button
            type="button"
            dir="rtl"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={`inline-flex min-h-[44px] min-w-0 flex-1 basis-[calc(50%-0.25rem)] items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-center transition-all sm:basis-[calc(50%-0.375rem)] ${
                selected
                    ? 'border-[#E6C673]/55 bg-[#E6C673]/14 text-[#FFF8DC]'
                    : 'border-white/10 bg-white/[0.03] text-slate-200 hover:border-white/20 hover:bg-white/[0.06]'
            }`}
        >
            <Icon
                className={`h-4 w-4 shrink-0 ${selected ? 'text-[#E6C673]' : 'text-slate-400'}`}
                aria-hidden
            />
            <span className="min-w-0 truncate text-[12px] font-bold leading-tight">{name}</span>
            <span
                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[8px] font-bold ${
                    isImmovable
                        ? 'bg-sky-500/15 text-sky-200/90'
                        : 'bg-emerald-500/15 text-emerald-200/90'
                }`}
            >
                {isImmovable ? 'عقار' : 'منقول'}
            </span>
        </button>
    );
}

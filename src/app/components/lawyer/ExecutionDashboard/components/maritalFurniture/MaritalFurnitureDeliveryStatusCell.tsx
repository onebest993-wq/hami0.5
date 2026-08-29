import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { Truck } from '@/app/components/ui/icons/Truck';
import { XCircle } from '@/app/components/ui/icons/XCircle';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import { resolveMaritalFurnitureDeliveryOutcome } from '@/app/utils/maritalFurniture';

export function MaritalFurnitureDeliveryStatusCell({ row }: { row: MaritalFurnitureItem }) {
    const outcome = resolveMaritalFurnitureDeliveryOutcome(row);
    if (outcome === 'pending') {
        return <span className="text-[9px] font-bold text-slate-500 text-center block">—</span>;
    }
    if (outcome === 'delivered') {
        return (
            <span className="inline-flex max-w-full items-center justify-center gap-0.5 rounded-lg bg-emerald-500/15 px-1.5 py-1 text-[9px] font-bold text-emerald-300 ring-1 ring-emerald-500/30 leading-tight">
                <CheckCircle size={11} className="shrink-0" aria-hidden />
                <span className="truncate">مُسلَّم</span>
            </span>
        );
    }
    if (outcome === 'external_delivered') {
        return (
            <span
                className="inline-flex max-w-full flex-col items-center justify-center rounded-lg bg-sky-500/15 px-1.5 py-1 text-[8px] font-bold text-sky-300 ring-1 ring-sky-500/30 leading-[1.15] text-center"
                title="تسليم خارجي — مقفل"
            >
                <Truck size={11} className="shrink-0" aria-hidden />
                <span className="mt-0.5">خارجي</span>
            </span>
        );
    }
    return (
        <span className="inline-flex max-w-full items-center justify-center gap-0.5 rounded-lg bg-rose-500/15 px-1.5 py-1 text-[9px] font-bold text-rose-300 ring-1 ring-rose-500/30 leading-tight">
            <XCircle size={11} className="shrink-0" aria-hidden />
            <span className="truncate">تعذّر</span>
        </span>
    );
}

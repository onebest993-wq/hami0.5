import { ChevronLeft } from '@/app/components/ui/lucideIcons';

export type MaritalFurnitureLauncherCardProps = {
    itemCount: number;
    lockedCount: number;
    totalLabel: string;
    deliveredLabel?: string;
    scheduleHint: string;
    onOpen: () => void;
    locked: boolean;
};

export function MaritalFurnitureLauncherCard({
    itemCount,
    lockedCount,
    totalLabel,
    deliveredLabel,
    scheduleHint,
    onOpen,
    locked,
}: MaritalFurnitureLauncherCardProps) {
    return (
        <button
            type="button"
            data-testid="marital-furniture-launcher"
            onClick={onOpen}
            className="mx-3 mt-2 w-[calc(100%-1.5rem)] rounded-xl border border-[#E6C673]/20 bg-[#0B1120]/75 px-3 py-2.5 text-right ring-1 ring-white/[0.03] transition-colors hover:border-[#E6C673]/35 hover:bg-[#E6C673]/8 touch-manipulation"
            dir="rtl"
        >
            <div className="flex items-center gap-2 flex-row-reverse">
                <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold leading-tight text-[#E6C673]">الأثاث الزوجية</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-400">{scheduleHint}</p>
                </div>
                <ChevronLeft size={16} className="shrink-0 text-[#E6C673]/50 rotate-180" aria-hidden />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 flex-row-reverse text-[9px]">
                <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-bold text-slate-300">
                    {itemCount} قطعة
                </span>
                {lockedCount > 0 ? (
                    <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-bold text-emerald-200/90">
                        {lockedCount} مُسجَّل
                    </span>
                ) : null}
                <span className="rounded-md border border-[#E6C673]/20 bg-[#E6C673]/8 px-1.5 py-0.5 font-mono font-bold text-[#E6C673]">
                    {totalLabel} د.ع
                </span>
                {deliveredLabel ? (
                    <span className="rounded-md border border-slate-500/20 bg-slate-500/10 px-1.5 py-0.5 font-mono font-bold text-slate-300">
                        مُسلَّم {deliveredLabel}
                    </span>
                ) : null}
                {locked ? (
                    <span className="rounded-md border border-slate-500/25 bg-slate-500/10 px-1.5 py-0.5 font-bold text-slate-300">
                        للعرض فقط
                    </span>
                ) : (
                    <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 font-bold text-sky-200/90">
                        فتح الإدارة
                    </span>
                )}
            </div>
        </button>
    );
}

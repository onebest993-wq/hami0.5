import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';

/**
 * ثوابت وعناصر UI صغيرة لـ ExecutionDashboard — بلا lazy imports (لا دورات chunk).
 * هياكل هندسية صامتة (بلا نبض) لحجز أول viewport حتى تقيّم الأقسام الكسولة.
 */
export { formatUnifiedLedgerDate } from './helpers/formatUnifiedLedgerDate';

const PAINT_ROW = 'h-11 min-h-[44px] rounded-lg border border-white/8 bg-white/[0.04]';

export const EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode = null;

/** هيكل صامت داخل نافذة حيّة — ليس طبقة فوق الإضبارة. */
export const EXEC_OVERLAY_INNER_SILENT_FALLBACK: React.ReactNode = (
    <div
        className="space-y-1.5 p-3"
        aria-busy="true"
        data-testid="execution-overlay-inner-paint-slot"
    >
        <div className={PAINT_ROW} aria-hidden />
        <div className={PAINT_ROW} aria-hidden />
        <div className={PAINT_ROW} aria-hidden />
    </div>
);

export const EXEC_HEADER_LAZY_FALLBACK: React.ReactNode = (
    <div
        className="mx-3 mt-1.5 mb-1.5 min-h-[44px] rounded-lg border border-amber-500/35 bg-[#0B1120]/80 px-2.5 py-1.5"
        aria-busy="true"
        data-testid="execution-header-paint-slot"
    />
);

export const EXEC_CREDITORS_LAZY_FALLBACK: React.ReactNode = (
    <div
        className="mx-3 mt-2 min-h-[44px] rounded-lg border border-emerald-500/30 bg-[#0B1120]/55"
        aria-busy="true"
        data-testid="execution-creditors-paint-slot"
    />
);

export const EXEC_DEBTORS_LAZY_FALLBACK: React.ReactNode = (
    <div
        className="mx-3 mt-2 min-h-[44px] rounded-lg border border-rose-500/30 bg-[#0B1120]/55"
        aria-busy="true"
        data-testid="execution-debtors-paint-slot"
    />
);

export const EXEC_ACTION_GRID_LAZY_FALLBACK: React.ReactNode = (
    <div
        className="relative mx-3 mt-2 overflow-hidden rounded-lg border border-white/[0.1] bg-[#0B1021] p-1.5"
        aria-busy="true"
        data-testid="execution-action-grid-paint-slot"
    >
        <div className="grid grid-cols-2 gap-1.5" aria-hidden>
            <div className={PAINT_ROW} />
            <div className={PAINT_ROW} />
            <div className={PAINT_ROW} />
            <div className={PAINT_ROW} />
            <div className={PAINT_ROW} />
            <div className={PAINT_ROW} />
        </div>
        <div
            className="mt-1.5 h-11 min-h-[44px] rounded-lg border border-[#E6C673]/24 bg-[#E6C673]/[0.08]"
            aria-hidden
        />
    </div>
);

export const EXEC_TIMELINE_LAZY_FALLBACK: React.ReactNode = (
    <div
        className="mx-3 mt-2 rounded-lg border border-white/[0.08] bg-[#0B1021]"
        aria-busy="true"
        data-testid="execution-timeline-paint-slot"
    >
        <div className="flex min-h-[44px] w-full items-center justify-end px-3 py-2">
            <span className="text-xs font-semibold text-slate-200">السجل الزمني</span>
        </div>
    </div>
);

export const EXEC_FOC_LAZY_FALLBACK: React.ReactNode = (
    <div
        className="space-y-1.5 py-1"
        data-testid="foc-instant-shell"
        aria-busy="true"
    >
        <p className="text-center text-sm font-bold text-[#E6C673]">المركز المالي</p>
        <div className="h-16 min-h-[44px] rounded-lg border border-[#E6C673]/15 bg-white/[0.04]" aria-hidden />
        <div className="h-24 rounded-lg border border-white/8 bg-white/[0.04]" aria-hidden />
        <div className="grid grid-cols-2 gap-1.5">
            <div className={PAINT_ROW} aria-hidden />
            <div className={PAINT_ROW} aria-hidden />
        </div>
    </div>
);

export const EXEC_SECTION_LAZY_FALLBACK: React.ReactNode = (
    <div
        className="mx-3 my-1.5 space-y-1.5"
        aria-busy="true"
        data-testid="execution-section-paint-slot"
    >
        <div className={PAINT_ROW} aria-hidden />
        <div className={PAINT_ROW} aria-hidden />
        <div className={PAINT_ROW} aria-hidden />
    </div>
);

export const AR_TABLIGH_RAQM: Record<number, string> = {
    1: 'واحد',
    2: 'اثنين',
    3: 'ثلاثة',
    4: 'أربعة',
    5: 'خمسة',
    6: 'ستة',
    7: 'سبعة',
    8: 'ثمانية',
    9: 'تسعة',
    10: 'عشرة',
};

type PartyOverflowToggleProps = {
    hiddenCount: number;
    expanded: boolean;
    onToggle: () => void;
    variant: 'creditor' | 'debtor';
};

export const PartyOverflowToggle = React.memo(function PartyOverflowToggle({
    hiddenCount,
    expanded,
    onToggle,
    variant,
}: PartyOverflowToggleProps) {
    const isCreditor = variant === 'creditor';
    const collapseLabel = isCreditor ? 'إخفاء الدائنين' : 'إخفاء المدينين';
    const expandLabel = isCreditor ? `عرض ${hiddenCount} دائن` : `عرض ${hiddenCount} مدين`;
    const buttonClass = isCreditor
        ? 'w-full min-h-[44px] bg-slate-800/50 border border-emerald-500/20 rounded-lg py-2 px-3 flex flex-row-reverse items-center justify-center gap-2 hover:bg-slate-800/70 transition-colors text-emerald-400 text-sm font-medium touch-manipulation'
        : 'w-full min-h-[44px] bg-slate-800/50 border border-rose-500/20 rounded-lg py-2 px-3 flex flex-row-reverse items-center justify-center gap-2 hover:bg-slate-800/70 transition-colors text-rose-400 text-sm font-medium touch-manipulation';

    return (
        <button type="button" onClick={onToggle} className={buttonClass}>
            <ChevronDown size={18} className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span>{expanded ? collapseLabel : expandLabel}</span>
        </button>
    );
});

/**
 * ثوابت وعناصر UI صغيرة لـ ExecutionDashboard — بلا lazy imports (لا دورات chunk).
 */
import React from 'react';
import { ChevronDown } from 'lucide-react';

export const EXEC_OVERLAY_LAZY_FALLBACK: React.ReactNode = null;
export const EXEC_FOC_LAZY_FALLBACK: React.ReactNode = null;
export const EXEC_SECTION_LAZY_FALLBACK: React.ReactNode = (
    <div className="mx-1 my-3 h-28 animate-pulse rounded-2xl bg-white/[0.04]" aria-hidden />
);

export function formatUnifiedLedgerDate(iso: string | undefined): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('ar-IQ');
}

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
        ? 'w-full backdrop-blur-xl bg-slate-800/40 border border-emerald-500/20 rounded-2xl py-2.5 px-3 flex flex-row-reverse items-center justify-center gap-2 hover:bg-slate-800/60 transition-all text-emerald-400 text-sm font-medium shadow-lg shadow-emerald-500/5'
        : 'w-full backdrop-blur-xl bg-slate-800/40 border border-rose-500/20 rounded-2xl py-2.5 px-3 flex flex-row-reverse items-center justify-center gap-2 hover:bg-slate-800/60 transition-all text-rose-400 text-sm font-medium shadow-lg shadow-rose-500/5';

    return (
        <button type="button" onClick={onToggle} className={buttonClass}>
            <ChevronDown size={18} className={`shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span>{expanded ? collapseLabel : expandLabel}</span>
        </button>
    );
});

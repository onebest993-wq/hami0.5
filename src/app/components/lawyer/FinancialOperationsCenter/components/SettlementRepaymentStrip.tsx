import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { FocLazyOverlay } from '../focOverlaySurfacesLazy';
import {
    LazySettlementRepaymentStripPanel,
    prefetchFocSettlementRepaymentStripPanel,
} from '../focLedgerMotionLazy';

export interface SettlementRepaymentStripProps {
    repaymentInput: string;
    setRepaymentInput: (v: string) => void;
    canApplyRepayment: boolean;
    onApply: () => boolean;
    disabled?: boolean;
    remainingUnified?: number;
    repaymentExceedsRemaining?: boolean;
}

/** تسديد فوري — الهيكل ظاهر من أول إطار؛ حركة التوسيع تُحمَّل عند الفتح */
export const SettlementRepaymentStrip: React.FC<SettlementRepaymentStripProps> = ({
    repaymentInput,
    setRepaymentInput,
    canApplyRepayment,
    onApply,
    disabled = false,
    remainingUnified = 0,
    repaymentExceedsRemaining = false,
}) => {
    const [expanded, setExpanded] = React.useState(false);

    React.useEffect(() => {
        if (disabled) setExpanded(false);
    }, [disabled]);

    if (expanded) prefetchFocSettlementRepaymentStripPanel();

    return (
        <div className="overflow-hidden rounded-xl border border-emerald-500/12 bg-emerald-500/[0.04]">
            <button
                type="button"
                disabled={disabled}
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right transition-colors hover:bg-emerald-500/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
                dir="rtl"
            >
                <span className="flex items-center gap-2 min-w-0" dir="rtl">
                    <span className="min-w-0 text-right">
                        <span className="block text-[11px] font-bold text-emerald-100">تسديد الوعاء</span>
                        <span className="block text-[9px] font-medium text-slate-500">
                            {expanded ? 'إخفاء نموذج التسديد' : 'تسجيل دفعة على المتبقي'}
                        </span>
                    </span>
                </span>
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-transform duration-200 ${
                        expanded ? 'rotate-180' : ''
                    }`}
                >
                    <ChevronDown size={14} />
                </span>
            </button>

            {expanded ? (
                <FocLazyOverlay
                    lazy={LazySettlementRepaymentStripPanel}
                    lazyProps={{
                        repaymentInput,
                        setRepaymentInput,
                        canApplyRepayment,
                        onApply,
                        disabled,
                        remainingUnified,
                        repaymentExceedsRemaining,
                        onCollapse: () => setExpanded(false),
                    }}
                    fallback={null}
                />
            ) : null}
        </div>
    );
};

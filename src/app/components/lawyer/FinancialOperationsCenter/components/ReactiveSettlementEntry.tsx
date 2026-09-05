import React from 'react';
import type { SettlementUxTier } from '../settlementUxMatrix';

export interface ReactiveSettlementEntryProps {
    tier: Extract<SettlementUxTier, 'secondary' | 'primary' | 'buried'>;
    isActive?: boolean;
    onActivate: () => void;
    onDeactivate?: () => void;
    className?: string;
    /** تسمية مختصرة: «تسوية» / «إخفاء» */
    shortLabel?: boolean;
    /** زر مدمج بجانب متبقي الوعاء */
    compact?: boolean;
}

export const ReactiveSettlementEntry: React.FC<ReactiveSettlementEntryProps> = ({
    tier,
    isActive = false,
    onActivate,
    onDeactivate: _onDeactivate,
    className = '',
    shortLabel = false,
    compact = false,
}) => {
    if (isActive) return null;

    const label = shortLabel ? 'تسوية' : 'عرض تسوية مالية';

    if (tier === 'buried' || (compact && tier === 'secondary')) {
        const inlineLabel = shortLabel ? 'تسوية' : 'عرض تسوية مالية';
        return (
            <button
                type="button"
                onClick={onActivate}
                className={[
                    'inline-flex items-center justify-center rounded-lg border border-[#E6C673]/30 bg-[#E6C673]/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-[#E6C673] transition hover:bg-[#E6C673]/14',
                    shortLabel ? 'min-w-[4.5rem]' : 'min-w-[7.5rem] max-w-[9rem]',
                    className,
                ].join(' ')}
            >
                {inlineLabel}
            </button>
        );
    }

    if (tier === 'primary') {
        return (
            <button
                type="button"
                onClick={onActivate}
                className={[
                    'w-full min-h-[40px] rounded-lg border border-[#E6C673]/40 bg-[#E6C673]/14 py-2.5 px-3 text-[11px] font-bold text-[#F0D78A] transition hover:bg-[#E6C673]/20 touch-manipulation',
                    className,
                ].join(' ')}
            >
                {label}
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onActivate}
            className={[
                'w-full min-h-[40px] rounded-lg border border-white/12 bg-white/[0.04] py-2.5 px-3 text-[11px] font-semibold text-slate-200 transition hover:bg-white/[0.07] touch-manipulation',
                className,
            ].join(' ')}
        >
            {label}
        </button>
    );
};

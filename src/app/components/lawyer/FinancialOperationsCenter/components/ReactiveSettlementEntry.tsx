import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
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
            <motion.button
                layout
                type="button"
                onClick={onActivate}
                className={[
                    'inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-md border border-cyan-500/35 bg-cyan-500/10 text-cyan-200/95 hover:bg-cyan-500/15 transition',
                    shortLabel ? 'min-w-[4.5rem]' : 'min-w-[7.5rem] max-w-[9rem]',
                    className,
                ].join(' ')}
            >
                <span className="text-[10px] font-semibold leading-tight text-center">{inlineLabel}</span>
            </motion.button>
        );
    }

    if (tier === 'primary') {
        return (
            <motion.button
                layout
                type="button"
                onClick={onActivate}
                className={[
                    'w-full rounded-xl bg-gradient-to-l from-cyan-500 to-sky-600 py-3.5 px-4 text-white font-black text-xs shadow-lg shadow-cyan-950/35 flex items-center justify-center gap-2 transition-colors hover:from-cyan-400 hover:to-sky-500',
                    className,
                ].join(' ')}
            >
                {label}
            </motion.button>
        );
    }

    return (
        <motion.button
            layout
            type="button"
            onClick={onActivate}
            className={[
                'w-full rounded-xl border border-cyan-500/30 bg-cyan-500/[0.04] py-3 px-4 text-cyan-300/90 text-[11px] font-bold backdrop-blur-sm transition-all hover:bg-cyan-500/10 hover:border-cyan-400/40 flex items-center justify-center gap-2',
                className,
            ].join(' ')}
        >
            {label}
        </motion.button>
    );
};

import React from 'react';
import { motion } from '@/app/motion/overlayMotionRuntime';
import { X } from '@/app/components/ui/icons/X';
import {
    AlimonyFinancialBlock,
    type AlimonyFinancialBreakdown,
} from '@/app/components/lawyer/AlimonyFinancialBlock';
import { FocModalPortal } from './FocModalPortal';

export type FocAlimonyDetailOverlayProps = {
    open: boolean;
    onClose: () => void;
    breakdown?: AlimonyFinancialBreakdown;
    wifeMonthlyAlimony: number;
    childrenMonthlyAlimony: number;
    childrenCount: number;
};

export function FocAlimonyDetailOverlay({
    open,
    onClose,
    breakdown,
    wifeMonthlyAlimony,
    childrenMonthlyAlimony,
    childrenCount,
}: FocAlimonyDetailOverlayProps): React.ReactElement | null {
    if (!open) return null;

    return (
        <FocModalPortal open onBackdropClick={onClose} backdropClassName="bg-black/60">
            <motion.div
                initial={{ scale: 0.98, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.98, opacity: 0, y: 8 }}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0A1122]/80 backdrop-blur-xl p-4 shadow-2xl"
                dir="rtl"
            >
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/10"
                        aria-label="إغلاق"
                    >
                        <X size={16} />
                    </button>
                    <h4 className="text-xs font-bold text-[#E6C673]/90 tracking-wide">استحقاق النفقة</h4>
                </div>
                <AlimonyFinancialBlock
                    breakdown={breakdown}
                    wifeMonthlyAlimony={wifeMonthlyAlimony}
                    childrenMonthlyAlimony={childrenMonthlyAlimony}
                    childrenCount={childrenCount}
                    entitlementsOnly
                />
            </motion.div>
        </FocModalPortal>
    );
}

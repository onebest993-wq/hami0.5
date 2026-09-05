import React from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { Layers } from '@/app/components/ui/icons/Layers';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';

export interface SeizureMatrixExpandLinkProps {
    label: string;
    onClick: () => void;
    /** additional = خيارات إضافية | maximum = خيارات الحجز القصوى */
    variant?: 'additional' | 'maximum';
}

export const SeizureMatrixExpandLink: React.FC<SeizureMatrixExpandLinkProps> = ({
    label,
    onClick,
    variant = 'additional',
}) => {
    const isMaximum = variant === 'maximum';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex min-h-[44px] w-full flex-row-reverse items-center justify-center gap-2 rounded-xl border px-4 py-2.5 touch-manipulation ${
                isMaximum
                    ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
                    : 'border-white/10 bg-white/[0.03] text-slate-400'
            }`}
        >
            <span className="flex flex-row-reverse items-center gap-2">
                {isMaximum ? (
                    <ShieldAlert size={13} strokeWidth={2} className="shrink-0 text-amber-400/80" />
                ) : (
                    <Layers size={13} strokeWidth={2} className="shrink-0 text-slate-500" />
                )}
                <span className="text-[11px] font-semibold tracking-wide">{label}</span>
            </span>
            <ChevronDown
                size={14}
                strokeWidth={2.5}
                className={`shrink-0 ${isMaximum ? 'text-amber-400/70' : 'text-slate-500'}`}
            />
        </button>
    );
};

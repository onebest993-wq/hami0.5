import React from 'react';
import { ChevronDown, Layers, ShieldAlert } from '@/app/components/ui/lucideIcons';

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
            className={[
                'group relative w-full overflow-hidden rounded-2xl border px-4 py-2.5',
                'backdrop-blur-xl transition-all duration-300',
                'flex flex-row-reverse items-center justify-center gap-2.5',
                isMaximum
                    ? 'border-amber-400/20 bg-gradient-to-l from-amber-500/[0.08] via-slate-900/30 to-transparent text-amber-200/80 hover:border-amber-400/35 hover:bg-amber-500/[0.12] hover:text-amber-100 shadow-lg shadow-amber-500/[0.06]'
                    : 'border-white/10 bg-gradient-to-l from-slate-800/50 via-slate-900/20 to-transparent text-slate-400 hover:border-white/20 hover:bg-white/[0.06] hover:text-slate-200 shadow-lg shadow-black/10',
            ].join(' ')}
        >
            <span
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent"
            />

            <span className="flex flex-row-reverse items-center gap-2">
                {isMaximum ? (
                    <ShieldAlert
                        size={13}
                        strokeWidth={2}
                        className="shrink-0 text-amber-400/70 transition-colors group-hover:text-amber-300/90"
                    />
                ) : (
                    <Layers
                        size={13}
                        strokeWidth={2}
                        className="shrink-0 text-slate-500 transition-colors group-hover:text-slate-300"
                    />
                )}
                <span className="text-[11px] font-semibold tracking-wide">{label}</span>
            </span>

            <ChevronDown
                size={14}
                strokeWidth={2.5}
                className={[
                    'shrink-0 transition-all duration-300 group-hover:translate-y-0.5',
                    isMaximum
                        ? 'text-amber-400/60 group-hover:text-amber-300'
                        : 'text-slate-500 group-hover:text-slate-300',
                ].join(' ')}
            />
        </button>
    );
};

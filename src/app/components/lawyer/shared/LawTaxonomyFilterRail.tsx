import React from 'react';

type LawTaxonomyFilterRailProps = {
    label: string;
    children: React.ReactNode;
    scrollAccent?: 'personal' | 'civil';
};

const SCROLLBAR_PERSONAL =
    '[scrollbar-color:rgba(196,165,116,0.45)_transparent] [&::-webkit-scrollbar-thumb]:bg-[#C4A574]/40';
const SCROLLBAR_CIVIL =
    '[scrollbar-color:rgba(56,189,248,0.35)_transparent] [&::-webkit-scrollbar-thumb]:bg-sky-400/35';

export function LawTaxonomyFilterRail({
    label,
    children,
    scrollAccent = 'personal',
}: LawTaxonomyFilterRailProps) {
    const scrollbarClass = scrollAccent === 'personal' ? SCROLLBAR_PERSONAL : SCROLLBAR_CIVIL;

    return (
        <div className="shrink-0 space-y-2">
            <p className="text-[9px] font-bold text-white/35">{label}</p>
            <div
                className={[
                    'overflow-x-auto overscroll-x-contain touch-pan-x [-webkit-overflow-scrolling:touch]',
                    'pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full',
                    scrollbarClass,
                ].join(' ')}
                dir="rtl"
            >
                <div
                    className="flex w-max min-w-full flex-nowrap gap-2"
                    role="tablist"
                    aria-label={label}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}

export const LAW_TAXONOMY_FILTER_BTN =
    'shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-bold transition-colors';

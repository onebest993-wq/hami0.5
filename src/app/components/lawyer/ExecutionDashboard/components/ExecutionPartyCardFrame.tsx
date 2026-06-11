import React from 'react';

type PartyCardVariant = 'creditor' | 'debtor';

const VARIANT = {
    creditor: {
        card: 'border-emerald-500/30 ring-emerald-500/12 hover:ring-emerald-500/22',
        badge: 'border-emerald-400/45 bg-[#0B1120]/95 text-emerald-300 shadow-emerald-950/40',
        panelBorder: 'border-emerald-500/15',
        headerFocus: 'focus-visible:ring-emerald-500/40',
    },
    debtor: {
        card: 'border-rose-500/30 ring-rose-500/12 hover:ring-rose-500/22',
        badge: 'border-rose-400/45 bg-[#0B1120]/95 text-rose-300 shadow-rose-950/40',
        panelBorder: 'border-rose-500/15',
        headerFocus: 'focus-visible:ring-rose-500/40',
    },
} as const;

const WOOD_GRAIN_STYLE: React.CSSProperties = {
    backgroundImage:
        'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 55%, rgba(0,0,0,0) 100%),' +
        'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 16px),' +
        'repeating-linear-gradient(135deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 16px)',
    backgroundBlendMode: 'overlay',
};

export type ExecutionPartyCardFrameProps = {
    variant: PartyCardVariant;
    roleLabel: string;
    badgeExtra?: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    expandAriaLabel: string;
    children: React.ReactNode;
    expandedPanel?: React.ReactNode;
    className?: string;
};

/** إطار موحّد لبطاقة دائن/مدين — الشارة متمركزة على الخط العلوي للحاوية */
export const ExecutionPartyCardFrame = React.memo(function ExecutionPartyCardFrame({
    variant,
    roleLabel,
    badgeExtra,
    isOpen,
    onToggle,
    expandAriaLabel,
    children,
    expandedPanel,
    className = '',
}: ExecutionPartyCardFrameProps) {
    const v = VARIANT[variant];

    const handleHeaderKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
        }
    };

    return (
        <div
            className={`relative isolate w-full overflow-visible rounded-2xl border bg-[#0B1120]/38 text-right shadow-[0_10px_32px_rgba(0,0,0,0.38)] ring-1 transition-[border-color,box-shadow] duration-150 ${v.card} ${className}`}
            dir="rtl"
            style={WOOD_GRAIN_STYLE}
        >
            <div
                className="pointer-events-none absolute left-1/2 top-0 z-20 flex -translate-x-1/2 -translate-y-1/2 justify-center"
                aria-hidden
            >
                <span
                    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-0.5 text-[11px] font-extrabold leading-none shadow-md backdrop-blur-md ${v.badge}`}
                >
                    {roleLabel}
                    {badgeExtra}
                </span>
            </div>
            <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                aria-label={expandAriaLabel}
                onClick={onToggle}
                onKeyDown={handleHeaderKeyDown}
                className={`relative z-[2] w-full cursor-pointer px-3 py-2 pt-2.5 text-right outline-none focus-visible:ring-2 ${v.headerFocus}`}
            >
                <div className="pointer-events-none [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_textarea]:pointer-events-auto [&_select]:pointer-events-auto [&_a]:pointer-events-auto [&_[role=button]]:pointer-events-auto">
                    {children}
                </div>
            </div>
            {expandedPanel != null ? (
                <div
                    className={`relative z-[20] border-t px-3 py-2 pointer-events-auto ${v.panelBorder} ${
                        isOpen ? '' : 'hidden'
                    }`}
                    aria-hidden={!isOpen}
                >
                    {expandedPanel}
                </div>
            ) : null}
        </div>
    );
});

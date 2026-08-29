import React from 'react';
import { EXECUTION_PARTY_FRAME_BASE } from '@/app/components/lawyer/ExecutionDashboard/executionDossierVisualLite';

type PartyCardVariant = 'creditor' | 'debtor';

const VARIANT = {
    creditor: {
        card: 'border-emerald-500/20 hover:border-emerald-500/32',
        badge: 'border-emerald-400/35 bg-[#0B1120] text-emerald-300/95',
        panelBorder: 'border-emerald-500/12',
        headerFocus: 'focus-visible:ring-emerald-500/35',
    },
    debtor: {
        card: 'border-rose-500/20 hover:border-rose-500/32',
        badge: 'border-rose-400/35 bg-[#0B1120] text-rose-300/95',
        panelBorder: 'border-rose-500/12',
        headerFocus: 'focus-visible:ring-rose-500/35',
    },
} as const;

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

    const handleHeaderClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, input, textarea, select, a, [data-exec-interactive]')) {
            return;
        }
        onToggle();
    };

    return (
        <div
            className={`${EXECUTION_PARTY_FRAME_BASE} ${v.card} ${className}`}
            dir="rtl"
        >
            <div
                className="pointer-events-none absolute left-1/2 top-0 z-20 flex -translate-x-1/2 -translate-y-1/2 justify-center"
                aria-hidden
            >
                <span
                    className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-bold leading-none ${v.badge}`}
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
                onClick={handleHeaderClick}
                onKeyDown={handleHeaderKeyDown}
                className={`relative z-[2] flex min-h-[44px] w-full cursor-pointer flex-col items-center justify-center gap-0.5 px-2.5 pb-1 pt-2 text-center outline-none focus-visible:ring-2 ${v.headerFocus}`}
            >
                <div className="pointer-events-none flex w-full flex-col items-center justify-center [&_button]:pointer-events-auto [&_input]:pointer-events-auto [&_textarea]:pointer-events-auto [&_select]:pointer-events-auto [&_a]:pointer-events-auto [&_[role=button]]:pointer-events-auto">
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

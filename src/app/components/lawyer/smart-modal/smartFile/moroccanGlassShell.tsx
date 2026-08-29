import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/icons/X';
import { useSmartFileModalTheme } from './smartFileModalTheme';
import {
    LV_BTN_GOLD,
    LV_ELEVATION_SOFT,
    LV_INSET,
    LV_RADIUS,
    LV_SURFACE_GOLD_SOLID,
} from '@/app/components/lawyer/lawyerShared/lawsuitVisualLite';

import { SMART_FILE_NESTED_MODAL_OVERLAY_CLASS } from './smartFileOverlayZ';

/** Shared glass styling for smart-file nested surfaces. */
export const GLASS_MODAL_OVERLAY = SMART_FILE_NESTED_MODAL_OVERLAY_CLASS;

export const GLASS_MODAL_SHELL = 'relative overflow-visible';

export const GLASS_MODAL_HEADER =
    'relative px-1 pt-1 pb-3.5 flex justify-between items-center';

export const GLASS_FIELD =
    `w-full ${LV_INSET} rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/35 focus:bg-white/[0.05] transition-colors [color-scheme:dark]`;

export const GLASS_BTN =
    `w-full ${LV_BTN_GOLD} py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed`;

export const GLASS_CLOSE =
    'relative flex h-11 w-11 min-h-[44px] min-w-[44px] items-center justify-center text-[#E6C673]/50 hover:text-[#E6C673] transition-colors touch-manipulation';

/** زر إغلاق يتماشى مع أقواس الزوايا */
export function MoroccanCloseButton({
    onClick,
    label = 'إغلاق',
}: {
    onClick: () => void;
    label?: string;
}) {
    return (
        <button type="button" onClick={onClick} className={GLASS_CLOSE} aria-label={label}>
            <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none opacity-70" aria-hidden>
                <path
                    d="M4 28 C4 14 4 4 16 4 L28 4"
                    fill="none"
                    stroke="#E6C673"
                    strokeWidth="1"
                    strokeOpacity="0.35"
                    strokeLinecap="round"
                />
            </svg>
            <X size={15} strokeWidth={2.25} className="relative z-[1]" />
        </button>
    );
}

export const GLASS_CHIP =
    'px-3 py-1 rounded-full text-[11px] font-semibold transition-colors border border-white/[0.08] bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white/80';

const GLASS_PANEL_SHELL =
    `relative ${LV_RADIUS} ${LV_SURFACE_GOLD_SOLID} overflow-hidden ${LV_ELEVATION_SOFT}`;

export function MoroccanHeaderDivider() {
    return (
        <div className="absolute bottom-0 inset-x-3 flex items-center justify-center gap-2 pointer-events-none" aria-hidden>
            <span className="flex-1 h-px bg-gradient-to-r from-transparent via-white/12 to-[#E6C673]/25" />
            <span className="h-1 w-1 rounded-full bg-[#E6C673]/55" />
            <span className="flex-1 h-px bg-gradient-to-l from-transparent via-white/12 to-[#E6C673]/25" />
        </div>
    );
}

type MoroccanGlassShellProps = {
    children: React.ReactNode;
    className?: string;
    maxWidth?: string;
    onOverlayClick?: () => void;
    overlayTestId?: string;
};

export function MoroccanGlassShell({
    children,
    className = '',
    maxWidth = 'max-w-2xl',
    onOverlayClick,
    overlayTestId,
}: MoroccanGlassShellProps) {
    const T = useSmartFileModalTheme();
    const layer = (
        <div className={T.overlay} dir="rtl" onClick={onOverlayClick} data-testid={overlayTestId}>
            <div
                className={`my-auto w-full ${maxWidth} max-h-[calc(100dvh-1.5rem)] ${T.shell} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`${T.shellCard} max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden`}>
                    {children}
                </div>
            </div>
        </div>
    );
    return typeof document !== 'undefined' ? createPortal(layer, document.body) : layer;
}

type MoroccanGlassPanelProps = React.HTMLAttributes<HTMLElement> & {
    children: React.ReactNode;
    className?: string;
    visualVariant?: 'civil' | 'personal';
};

export function MoroccanGlassPanel({ children, className = '', visualVariant = 'civil', ...rest }: MoroccanGlassPanelProps) {
    const shell =
        visualVariant === 'personal'
            ? 'relative rounded-xl border border-white/[0.07] bg-[#141214] overflow-hidden'
            : GLASS_PANEL_SHELL;
    return (
        <section className={`${shell} ${className}`} {...rest}>
            <div className="relative z-[1]">{children}</div>
        </section>
    );
}

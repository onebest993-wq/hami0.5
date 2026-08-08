import React from 'react';
import { createPortal } from 'react-dom';
import { X } from '@/app/components/ui/lucideIcons';
import { useSmartFileModalTheme } from './smartFileModalTheme';

import { SMART_FILE_NESTED_MODAL_OVERLAY_CLASS } from './smartFileOverlayZ';

/** Shared premium Moroccan glass styling for smart-file surfaces. */
export const GLASS_MODAL_OVERLAY = SMART_FILE_NESTED_MODAL_OVERLAY_CLASS;

export const GLASS_MODAL_SHELL =
    'relative overflow-visible';

export const GLASS_MODAL_HEADER =
    'relative px-1 pt-1 pb-4 flex justify-between items-center';

export const GLASS_FIELD =
    'w-full bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/35 focus:bg-white/[0.06] transition-all [color-scheme:dark]';

export const GLASS_SELECT =
    'w-full bg-[#0A0F1C]/80 border border-white/[0.08] rounded-xl p-3 text-sm text-white outline-none focus:border-[#E6C673]/35 focus:bg-[#0F121E]/90 transition-all cursor-pointer appearance-none [color-scheme:dark]';

export const GLASS_BTN =
    'w-full bg-[#E6C673]/15 border border-[#E6C673]/35 text-[#E6C673] py-3 rounded-xl font-bold text-sm transition-all hover:bg-[#E6C673]/25 disabled:opacity-50 disabled:cursor-not-allowed';

export const GLASS_CLOSE =
    'relative flex h-8 w-8 items-center justify-center text-[#E6C673]/55 hover:text-[#E6C673] transition-all hover:drop-shadow-[0_0_8px_rgba(230,198,115,0.45)]';

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
            <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>
                <path
                    d="M4 28 C4 14 4 4 16 4 L28 4"
                    fill="none"
                    stroke="#E6C673"
                    strokeWidth="1.2"
                    strokeOpacity="0.45"
                    strokeLinecap="round"
                />
            </svg>
            <X size={15} strokeWidth={2.25} className="relative z-[1]" />
        </button>
    );
}

export const GLASS_CHIP =
    'px-3 py-1 rounded-full text-[11px] font-bold transition-all border border-white/[0.08] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80';

export const GLASS_CHIP_ACTIVE =
    'px-3 py-1 rounded-full text-[11px] font-bold transition-all border border-[#E6C673]/35 bg-[#E6C673]/18 text-[#E6C673] shadow-[0_0_14px_rgba(230,198,115,0.18)]';

export const GLASS_PANEL_SHELL =
    'relative rounded-[24px] border border-[#E6C673]/14 bg-[radial-gradient(circle_at_top,rgba(230,198,115,0.08),transparent_34%),linear-gradient(180deg,rgba(17,22,35,0.92),rgba(10,15,28,0.94))] backdrop-blur-2xl overflow-hidden shadow-[0_14px_36px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.05)]';

export const GLASS_ACTION_BTN =
    'flex flex-col items-center justify-center rounded-[1.35rem] border border-[#E6C673]/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(230,198,115,0.06))] backdrop-blur-xl hover:bg-[#E6C673]/[0.08] hover:border-[#E6C673]/28 transition-all shadow-[0_10px_28px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.05)] group hover:-translate-y-[1px]';

const ZELLIGE_SVG = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <path d="M24 2 L30 18 L46 24 L30 30 L24 46 L18 30 L2 24 L18 18 Z" fill="none" stroke="rgba(230,198,115,0.22)" stroke-width="0.75"/>
      <path d="M24 10 L28 22 L40 24 L28 26 L24 38 L20 26 L8 24 L20 22 Z" fill="none" stroke="rgba(230,198,115,0.14)" stroke-width="0.6"/>
      <circle cx="24" cy="24" r="2.5" fill="none" stroke="rgba(230,198,115,0.18)" stroke-width="0.5"/>
    </svg>`,
);

export const MOROCCAN_ZELLIGE_BG = `[background-image:url("data:image/svg+xml,${ZELLIGE_SVG}")] [background-size:48px_48px]`;

/** زاوية واحدة — قوس مغربي (كل زاوية مرسومة صراحة بدون انعكاس خاطئ) */
function ArtCornerBracket({
    corner,
    gradId,
}: {
    corner: 'tl' | 'tr' | 'bl' | 'br';
    gradId: string;
}) {
    const pos =
        corner === 'tl'
            ? 'top-0 left-0'
            : corner === 'tr'
              ? 'top-0 right-0'
              : corner === 'bl'
                ? 'bottom-0 left-0'
                : 'bottom-0 right-0';

    const outer =
        corner === 'tl'
            ? 'M6 58 C6 28 6 6 34 6 L58 6'
            : corner === 'tr'
              ? 'M58 58 C58 28 58 6 30 6 L6 6'
              : corner === 'bl'
                ? 'M6 6 C6 36 6 58 34 58 L58 58'
                : 'M58 6 C58 36 58 58 30 58 L6 58';

    const inner =
        corner === 'tl'
            ? 'M12 52 C12 30 12 12 30 12 L52 12'
            : corner === 'tr'
              ? 'M52 52 C52 30 52 12 34 12 L12 12'
              : corner === 'bl'
                ? 'M12 12 C12 34 12 52 30 52 L52 52'
                : 'M52 12 C52 34 52 52 34 52 L12 52';

    const diamonds =
        corner === 'tl'
            ? ['M22 6 L24 9 L27 6 L24 3 Z', 'M38 6 L40 9 L43 6 L40 3 Z', 'M6 22 L9 24 L6 27 L3 24 Z']
            : corner === 'tr'
              ? ['M42 6 L40 9 L37 6 L40 3 Z', 'M26 6 L24 9 L21 6 L24 3 Z', 'M58 22 L55 24 L58 27 L61 24 Z']
              : corner === 'bl'
                ? ['M22 58 L24 55 L27 58 L24 61 Z', 'M6 42 L9 40 L6 37 L3 40 Z', 'M38 58 L40 55 L43 58 L40 61 Z']
                : ['M42 58 L40 55 L37 58 L40 61 Z', 'M58 42 L55 40 L58 37 L61 40 Z', 'M26 58 L24 55 L21 58 L24 61 Z'];

    return (
        <svg
            viewBox="0 0 64 64"
            className={`pointer-events-none absolute w-14 h-14 drop-shadow-[0_0_8px_rgba(230,198,115,0.25)] ${pos}`}
            aria-hidden
        >
            <defs>
                <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#B8942E" stopOpacity="0.55" />
                    <stop offset="45%" stopColor="#E6C673" stopOpacity="1" />
                    <stop offset="100%" stopColor="#F4D03F" stopOpacity="0.95" />
                </linearGradient>
            </defs>
            <path d={outer} fill="none" stroke={`url(#${gradId})`} strokeWidth="2" strokeLinecap="round" />
            <path d={inner} fill="none" stroke="#E6C673" strokeWidth="0.65" strokeOpacity="0.45" strokeLinecap="round" />
            {diamonds.map((d) => (
                <path key={d} d={d} fill="#E6C673" fillOpacity="0.35" />
            ))}
        </svg>
    );
}

/** أقواس زخرفية — زوايا أربع صحيحة */
export function MoroccanArtCornerBrackets() {
    const baseId = React.useId().replace(/:/g, '');

    return (
        <>
            <ArtCornerBracket corner="tl" gradId={`${baseId}-tl`} />
            <ArtCornerBracket corner="tr" gradId={`${baseId}-tr`} />
            <ArtCornerBracket corner="bl" gradId={`${baseId}-bl`} />
            <ArtCornerBracket corner="br" gradId={`${baseId}-br`} />
        </>
    );
}

export function MoroccanGlassBackdrop({ className = '' }: { className?: string }) {
    return (
        <div
            className={`pointer-events-none absolute inset-0 opacity-70 ${MOROCCAN_ZELLIGE_BG} ${className}`}
            aria-hidden
        />
    );
}

export function MoroccanHeaderDivider() {
    return (
        <div className="absolute bottom-0 inset-x-2 flex items-center justify-center gap-1 pointer-events-none" aria-hidden>
            <span className="flex-1 h-px bg-gradient-to-r from-transparent via-[#E6C673]/45 to-[#E6C673]/15" />
            <svg viewBox="0 0 64 10" className="w-16 h-2.5 shrink-0" aria-hidden>
                <path d="M32 1 L35 5 L32 9 L29 5 Z" fill="#E6C673" fillOpacity="0.55" />
                <path d="M20 3 L21.5 5 L20 7 L18.5 5 Z" fill="#E6C673" fillOpacity="0.3" />
                <path d="M44 3 L45.5 5 L44 7 L42.5 5 Z" fill="#E6C673" fillOpacity="0.3" />
            </svg>
            <span className="flex-1 h-px bg-gradient-to-l from-transparent via-[#E6C673]/45 to-[#E6C673]/15" />
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
                {T.useMoroccanCorners ? (
                    <>
                        <MoroccanArtCornerBrackets />
                        <div className="absolute inset-0 rounded-[28px] border border-[#E6C673]/12 bg-[radial-gradient(circle_at_top,rgba(230,198,115,0.10),transparent_34%),linear-gradient(180deg,rgba(18,24,38,0.96),rgba(10,15,28,0.97))] shadow-[0_24px_64px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.05)]" aria-hidden />
                        <MoroccanGlassBackdrop className="opacity-20 rounded-[28px]" />
                        <div className="relative z-[1] flex max-h-[calc(100dvh-1.5rem)] flex-col overflow-y-auto overscroll-contain rounded-[28px] px-4 py-3 sm:px-5 sm:py-4">
                            {children}
                        </div>
                    </>
                ) : (
                    <div className={`${T.shellCard} max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain`}>
                        {children}
                    </div>
                )}
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
            {visualVariant === 'civil' ? <MoroccanGlassBackdrop className="opacity-35" /> : null}
            <div className="relative z-[1]">{children}</div>
        </section>
    );
}

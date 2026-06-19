import React from 'react';
import { cn } from '@/app/components/ui/utils';
import { PS_GLASS_SHADOW, PS_PANEL, PS_ROSE_GLASS_SHADOW } from './personalStatusPearlTheme';

/**
 * نقش zellige — لؤلؤي/فضي (ليس ذهبي/قهوة)
 */
const PS_ARABESQUE_SVG = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
      <path d="M40 2 L46 26 L70 32 L46 38 L40 62 L34 38 L10 32 L34 26 Z" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="0.68"/>
      <path d="M40 12 L43.5 26 L56 29 L43.5 32 L40 46 L36.5 32 L24 29 L36.5 26 Z" fill="none" stroke="rgba(236,232,224,0.22)" stroke-width="0.55"/>
      <path d="M40 20 L41.5 28 L48 29 L41.5 30 L40 38 L38.5 30 L32 29 L38.5 28 Z" fill="rgba(255,255,255,0.06)"/>
      <circle cx="40" cy="40" r="8" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="0.48"/>
      <circle cx="40" cy="40" r="3.5" fill="rgba(255,255,255,0.05)" stroke="rgba(236,232,224,0.16)" stroke-width="0.38"/>
      <path d="M40 2 L40 62 M10 32 L70 32 M18 18 L62 62 M62 18 L18 62" stroke="rgba(255,255,255,0.07)" stroke-width="0.35"/>
      <path d="M4 22 Q4 4 22 4" fill="none" stroke="rgba(236,232,224,0.14)" stroke-width="0.42"/>
      <path d="M76 22 Q76 4 58 4" fill="none" stroke="rgba(236,232,224,0.14)" stroke-width="0.42"/>
      <path d="M4 58 Q4 76 22 76" fill="none" stroke="rgba(236,232,224,0.12)" stroke-width="0.42"/>
      <path d="M76 58 Q76 76 58 76" fill="none" stroke="rgba(236,232,224,0.12)" stroke-width="0.42"/>
    </svg>`,
);

const PS_ARABESQUE_FINE_SVG = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <path d="M20 2 L22 14 L34 16 L22 18 L20 30 L18 18 L6 16 L18 14 Z" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="0.42"/>
      <circle cx="20" cy="20" r="2" fill="none" stroke="rgba(236,232,224,0.14)" stroke-width="0.32"/>
      <path d="M20 2 L20 30 M6 16 L34 16" stroke="rgba(255,255,255,0.06)" stroke-width="0.28"/>
    </svg>`,
);

export const PS_ARABESQUE_BG = `[background-image:url("data:image/svg+xml,${PS_ARABESQUE_SVG}")] [background-size:80px_80px]`;
export const PS_ARABESQUE_FINE_BG = `[background-image:url("data:image/svg+xml,${PS_ARABESQUE_FINE_SVG}")] [background-size:40px_40px]`;

type ZelligeProps = {
    className?: string;
    opacity?: number;
    fine?: boolean;
};

export function PersonalStatusZelligeOverlay({
    className = '',
    opacity = 0.12,
    fine = false,
}: ZelligeProps) {
    return (
        <div
            className={cn(
                'pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden',
                fine ? PS_ARABESQUE_FINE_BG : PS_ARABESQUE_BG,
                className,
            )}
            style={{ opacity }}
            aria-hidden
        />
    );
}

export function PersonalStatusArabesqueLayers({
    primary = 0.13,
    fine = 0.07,
    className = '',
}: {
    primary?: number;
    fine?: number;
    className?: string;
}) {
    return (
        <>
            <PersonalStatusZelligeOverlay opacity={primary} className={className} />
            <PersonalStatusZelligeOverlay opacity={fine} fine className={className} />
        </>
    );
}

/** بريق لؤلؤي خفيف — خط علوي فقط لتجنّب انعكاس عمودي */
export function PersonalStatusGlassSheen({ className = '' }: { className?: string }) {
    return (
        <div
            className={cn(
                'pointer-events-none absolute inset-x-0 top-0 h-[32%] rounded-[inherit]',
                'bg-gradient-to-b from-white/[0.04] to-transparent',
                className,
            )}
            aria-hidden
        />
    );
}

/** انكسار زجاج وردي — توهج علوي خفيف فقط */
export function PersonalStatusRoseGlassFacets({ className = '' }: { className?: string }) {
    return (
        <div
            className={cn(
                'pointer-events-none absolute inset-x-0 top-0 h-[36%] rounded-[inherit]',
                'bg-gradient-to-b from-[#FFD4DC]/[0.06] to-transparent',
                className,
            )}
            aria-hidden
        />
    );
}

/** بريق زجاج وردي — بدون تدرج قطري */
export function PersonalStatusRoseGlassSheen({ className = '' }: { className?: string }) {
    return <PersonalStatusRoseGlassFacets className={className} />;
}

export function PersonalStatusPagePattern({ className = '' }: { className?: string }) {
    return null;
}

export function PersonalStatusMoroccanDivider({ className = '' }: { className?: string }) {
    return (
        <div className={cn('flex items-center justify-center gap-1.5 px-3 pointer-events-none', className)} aria-hidden>
            <span className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.28] to-[#ECE8E2]/15" />
            <svg viewBox="0 0 80 12" className="w-[4.5rem] h-3 shrink-0" aria-hidden>
                <path d="M40 1 L43 6 L40 11 L37 6 Z" fill="#FFFEF9" fillOpacity="0.45" />
                <path d="M28 3 L29.8 6 L28 9 L26.2 6 Z" fill="#ECE8E2" fillOpacity="0.35" />
                <path d="M52 3 L53.8 6 L52 9 L50.2 6 Z" fill="#ECE8E2" fillOpacity="0.35" />
            </svg>
            <span className="flex-1 h-px bg-gradient-to-l from-transparent via-white/[0.28] to-[#ECE8E2]/15" />
        </div>
    );
}

type PersonalStatusGlassPanelProps = {
    children: React.ReactNode;
    className?: string;
    patternOpacity?: number;
    sheen?: boolean;
    /** pearl = لؤلؤي · rose = زجاج وردي لامع */
    tone?: 'pearl' | 'rose';
};

export function PersonalStatusGlassPanel({
    children,
    className,
    patternOpacity = 0.05,
    sheen = false,
    tone = 'pearl',
}: PersonalStatusGlassPanelProps) {
    const isRose = tone === 'rose';
    return (
        <div
            className={cn(
                'relative overflow-hidden backdrop-blur-md',
                isRose
                    ? cn(
                          'border border-[#F0A8B4]/20',
                          'bg-gradient-to-br from-[#F5C6D0]/[0.10] via-[#FFD4DC]/[0.05] to-white/[0.03]',
                          PS_ROSE_GLASS_SHADOW,
                      )
                    : cn(
                          'border border-white/[0.12]',
                          'bg-gradient-to-br from-white/[0.07] via-[#F8F6F0]/[0.04] to-[#ECE8E2]/[0.03]',
                          PS_GLASS_SHADOW,
                      ),
                className,
            )}
        >
            <PersonalStatusArabesqueLayers primary={patternOpacity} fine={patternOpacity * 0.5} />
            {sheen ? (isRose ? <PersonalStatusRoseGlassSheen /> : <PersonalStatusGlassSheen />) : null}
            <div className="relative z-[1]">{children}</div>
        </div>
    );
}

type PearlTileProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    className?: string;
    patternOpacity?: number;
};

export function PersonalStatusPearlTile({
    children,
    className,
    patternOpacity = 0.05,
    ...props
}: PearlTileProps) {
    return (
        <button
            type="button"
            {...props}
            className={cn(
                PS_PANEL,
                'relative overflow-hidden transition-all duration-200',
                'hover:border-white/[0.18] hover:from-white/[0.09] active:scale-[0.99]',
                className,
            )}
        >
            <PersonalStatusArabesqueLayers primary={patternOpacity} fine={patternOpacity * 0.5} />
            <div className="relative z-[1]">{children}</div>
        </button>
    );
}

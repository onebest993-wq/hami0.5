import React from 'react';

type MoroccanGlassOverlayProps = {
    className?: string;
    opacity?: number;
};

const MOROCCAN_GLASS_TILE = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <g fill="none" stroke="#E6C673" stroke-width="0.55" opacity="0.85">
    <path d="M28 2 L54 28 L28 54 L2 28 Z"/>
    <path d="M28 10 L46 28 L28 46 L10 28 Z"/>
    <circle cx="28" cy="28" r="6"/>
    <path d="M28 2 L28 54 M2 28 L54 28 M8 8 L48 48 M48 8 L8 48"/>
  </g>
</svg>`.trim());

/** ┘┘é╪┤ zellige ╪«┘┘è┘ ظ¤ ╪╖╪ذ┘é╪ر ╪▓╪«╪▒┘┘è╪ر ┘┘╪▓╪ش╪د╪ش */
export function MoroccanGlassOverlay({ className = '', opacity = 0.07 }: MoroccanGlassOverlayProps) {
    return (
        <div
            className={`absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden ${className}`}
            aria-hidden
            style={{
                opacity,
                backgroundImage: `url("data:image/svg+xml,${MOROCCAN_GLASS_TILE}")`,
                backgroundSize: '56px 56px',
            }}
        />
    );
}

type MoroccanGlassFrameProps = {
    children: React.ReactNode;
    className?: string;
    patternOpacity?: number;
    /** false = ┘╪د ┘è┘é╪╡ ╪د┘╪╣┘╪د╪╡╪▒ ╪د┘╪ذ╪د╪▒╪▓╪ر (┘à╪س┘ ╪د┘╪╡┘ê╪▒╪ر ╪د┘╪┤╪«╪╡┘è╪ر) */
    clip?: boolean;
    /** ┘è┘╪╣┘ّ┘ ╪ث┘┘à╪د╪╖ ╪«╪د┘à╪ر ╪╡┘╪ص╪ر ╪د┘┘à┘┘ ╪د┘╪┤╪«╪╡┘è */
    profilePanel?: boolean;
    /** ┘┘é╪┤ zellige ظ¤ ┘┘é╪╖ ┘à╪╣ ╪«╪د┘à╪ر ┬س╪▓╪«╪▒┘┘è┬╗ */
    ornatePattern?: boolean;
};

/** ╪ح╪╖╪د╪▒ ╪▓╪ش╪د╪ش┘è ╪┤┘╪د┘ ┘à╪╣ ┘┘é╪┤ ┘à╪║╪▒╪ذ┘è ╪د╪«╪ز┘è╪د╪▒┘è */
export function MoroccanGlassFrame({
    children,
    className = '',
    patternOpacity = 0.08,
    clip = true,
    profilePanel = false,
    ornatePattern = false,
}: MoroccanGlassFrameProps) {
    const showMoroccan = profilePanel ? ornatePattern : true;

    return (
        <div
            {...(profilePanel ? { 'data-profile-panel': '' } : {})}
            className={
                profilePanel
                    ? `relative hami-profile-panel-shell ${clip ? 'overflow-hidden' : 'overflow-visible'} ${className}`
                    : `relative bg-[#0C1220]/88 backdrop-blur-md border border-[#E6C673]/14 shadow-[0_8px_28px_rgba(0,0,0,0.26),0_1px_0_rgba(255,255,255,0.04)_inset] ${clip ? 'overflow-hidden' : 'overflow-visible'} ${className}`
            }
        >
            {showMoroccan ? <MoroccanGlassOverlay opacity={Math.min(patternOpacity, 0.045)} /> : null}
            {profilePanel ? null : (
                <div
                    className="absolute inset-0 bg-gradient-to-br from-[#E6C673]/[0.04] via-transparent to-transparent pointer-events-none rounded-[inherit]"
                    aria-hidden
                />
            )}
            <div className="relative z-[1]">{children}</div>
        </div>
    );
}

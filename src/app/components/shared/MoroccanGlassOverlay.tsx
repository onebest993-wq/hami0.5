import React from 'react';

type MoroccanGlassOverlayProps = {
    className?: string;
    opacity?: number;
};

/** نقش زellige خفيف — طبقة زخرفية للزجاج */
export function MoroccanGlassOverlay({ className = '', opacity = 0.07 }: MoroccanGlassOverlayProps) {
    const tile = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
  <g fill="none" stroke="#E6C673" stroke-width="0.55" opacity="0.85">
    <path d="M28 2 L54 28 L28 54 L2 28 Z"/>
    <path d="M28 10 L46 28 L28 46 L10 28 Z"/>
    <circle cx="28" cy="28" r="6"/>
    <path d="M28 2 L28 54 M2 28 L54 28 M8 8 L48 48 M48 8 L8 48"/>
  </g>
</svg>`.trim());

    return (
        <div
            className={`absolute inset-0 pointer-events-none rounded-[inherit] overflow-hidden ${className}`}
            aria-hidden
            style={{
                opacity,
                backgroundImage: `url("data:image/svg+xml,${tile}")`,
                backgroundSize: '56px 56px',
            }}
        />
    );
}

type MoroccanGlassFrameProps = {
    children: React.ReactNode;
    className?: string;
    patternOpacity?: number;
    /** false = لا يقص العناصر البارزة (مثل الصورة الشخصية) */
    clip?: boolean;
};

/** إطار زجاجي شفاف مع نقش مغربي */
export function MoroccanGlassFrame({
    children,
    className = '',
    patternOpacity = 0.08,
    clip = true,
}: MoroccanGlassFrameProps) {
    return (
        <div
            className={`relative bg-white/[0.03] backdrop-blur-2xl border border-[#E6C673]/15 shadow-[0_12px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] ${clip ? 'overflow-hidden' : 'overflow-visible'} ${className}`}
        >
            <MoroccanGlassOverlay opacity={patternOpacity} />
            <div
                className="absolute inset-0 bg-gradient-to-br from-[#E6C673]/[0.06] via-transparent to-indigo-500/[0.04] pointer-events-none rounded-[inherit]"
                aria-hidden
            />
            <div className="relative z-[1]">{children}</div>
        </div>
    );
}

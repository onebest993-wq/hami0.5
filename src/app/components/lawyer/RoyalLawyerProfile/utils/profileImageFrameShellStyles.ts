import type React from 'react';

export function rimPadPx(rim: string | undefined): number {
    switch (rim) {
        case 'minimal':
            return 2;
        case 'ornate':
            return 8;
        case 'neon':
            return 5;
        case 'gold':
        default:
            return 4;
    }
}

export function buildProfileImageFrameClass(args: {
    rim: string;
    template: string;
    interaction: string;
    tiltActive: boolean;
    isPerspective: boolean;
    borderless: boolean;
}): string {
    const { rim, template, interaction, tiltActive, isPerspective, borderless } = args;
    const parts = [
        'profile-image-frame',
        `profile-image-frame--rim-${rim}`,
        `profile-image-frame--template-${template}`,
    ];
    if (interaction === 'kenBurns') parts.push('profile-image-frame--ken-burns');
    if (interaction === 'shimmer') parts.push('profile-image-frame--shimmer');
    if (interaction === 'pulse') parts.push('profile-image-frame--pulse-inner');
    if (interaction === 'parallax') parts.push('profile-image-frame--parallax');
    if (interaction === 'tilt') parts.push('profile-image-frame--tilt');
    if (tiltActive) parts.push('profile-image-frame--tilt-active');
    if (isPerspective && !borderless) parts.push('profile-media-perspective');
    return parts.join(' ');
}

export function buildProfileImageFrameWrapClass(args: {
    template: string;
    rim: string;
    interaction: string;
}): string {
    const { template, rim, interaction } = args;
    return [
        'profile-image-frame-wrap',
        `profile-image-frame-wrap--template-${template}`,
        `profile-image-frame-wrap--rim-${rim}`,
        interaction === 'pulse' ? 'profile-image-frame-wrap--pulse' : '',
        interaction === 'tilt' ? 'profile-image-frame-wrap--tilt' : '',
    ]
        .filter(Boolean)
        .join(' ');
}

export function buildProfileImageClipStyle(
    clip: string | undefined,
    isPerspective: boolean,
): React.CSSProperties | undefined {
    if (!clip || isPerspective) return undefined;
    return { clipPath: clip, WebkitClipPath: clip } as React.CSSProperties;
}

export function buildProfileImageWrapStyle(args: {
    accent: string;
    hasShapedClip: boolean;
    heightPx: number;
    useAspect: boolean;
    aspectRatio: string | undefined;
    interaction: string;
    tiltActive: boolean;
    tilt: { x: number; y: number };
}): React.CSSProperties {
    const {
        accent,
        hasShapedClip,
        heightPx,
        useAspect,
        aspectRatio,
        interaction,
        tiltActive,
        tilt,
    } = args;
    return {
        '--img-accent': accent,
        ...(hasShapedClip
            ? {
                  width: `min(100%, ${heightPx}px)`,
                  maxWidth: '100%',
                  aspectRatio: '1 / 1',
                  height: 'auto',
                  marginInline: 'auto',
              }
            : {
                  height: useAspect ? undefined : heightPx,
                  maxHeight: useAspect ? undefined : 320,
                  aspectRatio: useAspect ? aspectRatio : undefined,
              }),
        transform:
            interaction === 'tilt' && tiltActive
                ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
                : undefined,
    } as unknown as React.CSSProperties;
}

export function buildProfileImageRimShellStyle(args: {
    borderless: boolean;
    clipStyle: React.CSSProperties | undefined;
    pad: number;
    rim: string;
    accent: string;
}): React.CSSProperties {
    const { borderless, clipStyle, pad, rim, accent } = args;
    if (borderless) {
        return {
            ...clipStyle,
            padding: 0,
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
        } as React.CSSProperties;
    }

    const base: React.CSSProperties = {
        ...clipStyle,
        padding: pad,
        boxSizing: 'border-box',
    };

    if (rim === 'minimal') {
        base.background = 'rgba(255,255,255,0.28)';
        base.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,0.18)';
    } else if (rim === 'neon') {
        base.background = `linear-gradient(135deg, ${accent}, color-mix(in srgb, ${accent} 35%, #fff) 55%, ${accent})`;
        base.boxShadow = `0 0 18px color-mix(in srgb, ${accent} 55%, transparent), 0 0 4px ${accent}`;
    } else if (rim === 'ornate') {
        base.background = `
                linear-gradient(${accent}, ${accent}) padding-box,
                linear-gradient(135deg, color-mix(in srgb, ${accent} 95%, #fff), ${accent}, color-mix(in srgb, ${accent} 45%, #000)) border-box
            `;
        base.border = `2px solid transparent`;
        base.boxShadow = `0 0 0 1px color-mix(in srgb, ${accent} 40%, transparent), inset 0 0 0 3px rgba(0,0,0,0.35)`;
    } else {
        base.background = `linear-gradient(160deg, color-mix(in srgb, ${accent} 88%, #fff), ${accent} 45%, color-mix(in srgb, ${accent} 70%, #000))`;
        base.boxShadow = `0 2px 10px color-mix(in srgb, ${accent} 28%, transparent)`;
    }

    return base;
}

export function buildProfileImageImgStyle(args: {
    focusX: number;
    focusY: number;
    interaction: string;
    zoom: number;
}): React.CSSProperties {
    const { focusX, focusY, interaction, zoom } = args;
    const base: React.CSSProperties = {
        objectPosition: `${focusX}% ${focusY}%`,
        transformOrigin: `${focusX}% ${focusY}%`,
    };
    if (interaction !== 'kenBurns' && interaction !== 'parallax') {
        base.transform = `scale(${zoom})`;
    }
    return base;
}

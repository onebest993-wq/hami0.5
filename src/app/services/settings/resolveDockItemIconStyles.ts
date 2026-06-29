import type { CSSProperties } from 'react';

export function resolveDockItemIconStyles(params: {
    accent: string;
    active?: boolean;
    buttonBoxPx: number;
    iconRadiusRem: number;
    iconStrokePx: number;
    labelPx: number;
}): {
    accent: string;
    boxStyle: CSSProperties;
    iconStyle: CSSProperties;
    labelStyle: CSSProperties;
} {
    const { accent, active, buttonBoxPx, iconRadiusRem, iconStrokePx, labelPx } = params;
    const iconSize = iconStrokePx + 2;

    return {
        accent,
        boxStyle: {
            width: buttonBoxPx,
            height: buttonBoxPx,
            borderRadius: `${iconRadiusRem}rem`,
            background: active
                ? `color-mix(in srgb, ${accent} 14%, rgba(255,255,255,0.05))`
                : `color-mix(in srgb, ${accent} 6%, rgba(255,255,255,0.04))`,
            border: active
                ? `1px solid color-mix(in srgb, ${accent} 35%, transparent)`
                : `1px solid color-mix(in srgb, ${accent} 18%, rgba(255,255,255,0.09))`,
            boxShadow: active
                ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 8px 24px color-mix(in srgb, ${accent} 14%, transparent)`
                : 'inset 0 1px 0 rgba(255,255,255,0.07)',
        },
        iconStyle: {
            width: iconSize,
            height: iconSize,
            color: active ? accent : 'rgba(255,255,255,0.85)',
            filter: active ? `drop-shadow(0 0 10px color-mix(in srgb, ${accent} 35%, transparent))` : undefined,
        },
        labelStyle: {
            fontSize: labelPx,
            color: active ? accent : 'rgba(255,255,255,0.55)',
        },
    };
}

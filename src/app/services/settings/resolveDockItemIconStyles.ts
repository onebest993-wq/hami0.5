import type { CSSProperties } from 'react';
import { isAndroidNativeShell } from '@/app/runtime/nativePlatform';

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
    const android = isAndroidNativeShell();

    return {
        accent,
        boxStyle: {
            width: buttonBoxPx,
            height: buttonBoxPx,
            borderRadius: `${iconRadiusRem}rem`,
            background: active
                ? android
                    ? `color-mix(in srgb, ${accent} 22%, #141a2c)`
                    : `color-mix(in srgb, ${accent} 16%, rgba(255,255,255,0.06))`
                : android
                  ? `color-mix(in srgb, ${accent} 12%, #121826)`
                  : `color-mix(in srgb, ${accent} 10%, rgba(255,255,255,0.05))`,
            border: active
                ? `1px solid color-mix(in srgb, ${accent} 42%, transparent)`
                : `1px solid color-mix(in srgb, ${accent} ${android ? 28 : 24}%, rgba(255,255,255,0.1))`,
            boxShadow: android
                ? active
                    ? 'inset 0 1px 0 rgba(255,255,255,0.14), 0 1px 2px rgba(0,0,0,0.45)'
                    : 'inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 2px rgba(0,0,0,0.35)'
                : active
                  ? `inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 18px color-mix(in srgb, ${accent} 12%, transparent)`
                  : 'inset 0 1px 0 rgba(255,255,255,0.09), 0 1px 2px rgba(0,0,0,0.22)',
        },
        iconStyle: {
            width: iconSize,
            height: iconSize,
            color: active ? accent : android ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.88)',
            /* drop-shadow يتشوّه على WebView Android */
            filter: android || !active ? undefined : `drop-shadow(0 0 10px color-mix(in srgb, ${accent} 35%, transparent))`,
        },
        labelStyle: {
            fontSize: labelPx,
            color: active ? accent : android ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.68)',
        },
    };
}

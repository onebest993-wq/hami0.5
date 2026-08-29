import type { CSSProperties } from 'react';
import { hubIconBoxPx, hubIconStrokePx, hubRouteTitleRem, hubRouteTitleRemHalf } from '@/app/services/settings/homeBlockScale';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';

export function resolveHubRouteTileVisuals(params: {
    accent: string;
    size: HomeBlockStyleOverride['size'];
    layoutSpan?: 1 | 2;
}): {
    iconWrapStyle: CSSProperties;
    iconGlowStyle: CSSProperties;
    iconBoxStyle: CSSProperties;
    iconStyle: CSSProperties;
    titleStyle: CSSProperties;
    titleRuleStyle: CSSProperties;
    glowOrbStyle: CSSProperties;
} {
    const { accent, size = 'normal', layoutSpan = 2 } = params;
    const isHalf = layoutSpan === 1;
    const boxPx = hubIconBoxPx(size ?? 'normal') * (isHalf ? 0.92 : 1);
    const iconPx = hubIconStrokePx(size ?? 'normal') * (isHalf ? 0.92 : 1);
    const baseRem = isHalf
        ? hubRouteTitleRemHalf(size ?? 'normal')
        : hubRouteTitleRem(size ?? 'normal');
    const scale = isHalf ? '1' : 'var(--hami-content-scale, 1)';

    return {
        iconWrapStyle: {
            width: `calc(${boxPx}px * ${scale})`,
            height: `calc(${boxPx}px * ${scale})`,
        },
        iconGlowStyle: {
            background: `color-mix(in srgb, ${accent} 40%, transparent)`,
        },
        iconBoxStyle: {
            background: `linear-gradient(155deg, color-mix(in srgb, ${accent} 28%, rgba(255,255,255,0.08)) 0%, rgba(0,0,0,0.58) 100%)`,
            border: `1px solid color-mix(in srgb, ${accent} 48%, transparent)`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), 0 8px 24px color-mix(in srgb, ${accent} 18%, transparent)`,
        },
        iconStyle: {
            width: `calc(${iconPx}px * ${scale})`,
            height: `calc(${iconPx}px * ${scale})`,
            color: accent,
            filter: `drop-shadow(0 2px 10px color-mix(in srgb, ${accent} 45%, transparent))`,
        },
        titleStyle: isHalf
            ? {
                  ['--hami-hub-title-accent' as string]: accent,
                  ['--hami-hub-title-size' as string]: `${baseRem}rem`,
              }
            : {
                  fontSize: `calc(${baseRem}rem * ${scale})`,
                  ['--hami-hub-title-accent' as string]: accent,
                  ['--hami-hub-title-size' as string]: `${baseRem}rem`,
              },
        titleRuleStyle: {
            width: `calc(${layoutSpan === 1 ? 1.75 : 2.85}rem * ${scale})`,
            height: layoutSpan === 1 ? '1px' : `max(2px, calc(2.5px * ${scale}))`,
            background: `linear-gradient(to left, color-mix(in srgb, ${accent} 95%, #FFF8E7), color-mix(in srgb, ${accent} 30%, transparent), transparent)`,
            boxShadow:
                layoutSpan === 1
                    ? 'none'
                    : `0 0 14px color-mix(in srgb, ${accent} 38%, transparent)`,
        },
        glowOrbStyle: {
            background: `${accent}33`,
        },
    };
}

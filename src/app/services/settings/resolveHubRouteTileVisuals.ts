import type { CSSProperties } from 'react';
import { hubIconBoxPx, hubIconStrokePx, hubRouteTitleRem } from '@/app/services/settings/homeBlockScale';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';

export function resolveHubRouteTileVisuals(params: {
    accent: string;
    size: HomeBlockStyleOverride['size'];
}): {
    iconWrapStyle: CSSProperties;
    iconGlowStyle: CSSProperties;
    iconBoxStyle: CSSProperties;
    iconStyle: CSSProperties;
    titleStyle: CSSProperties;
    titleRuleStyle: CSSProperties;
    glowOrbStyle: CSSProperties;
} {
    const { accent, size = 'normal' } = params;
    const boxPx = hubIconBoxPx(size ?? 'normal');
    const iconPx = hubIconStrokePx(size ?? 'normal');
    const baseRem = hubRouteTitleRem(size ?? 'normal');
    const scale = 'var(--hami-content-scale, 1)';

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
        titleStyle: {
            fontSize: `calc(${baseRem}rem * ${scale})`,
            backgroundImage: `linear-gradient(148deg, #FFF9EE 0%, #F8F2E8 38%, color-mix(in srgb, ${accent} 48%, #F5F0E6) 100%)`,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            filter: `drop-shadow(0 3px 16px color-mix(in srgb, ${accent} 45%, transparent))`,
        },
        titleRuleStyle: {
            width: `calc(2.85rem * ${scale})`,
            height: `max(2px, calc(2.5px * ${scale}))`,
            background: `linear-gradient(to left, color-mix(in srgb, ${accent} 95%, #FFF8E7), color-mix(in srgb, ${accent} 30%, transparent), transparent)`,
            boxShadow: `0 0 14px color-mix(in srgb, ${accent} 38%, transparent)`,
        },
        glowOrbStyle: {
            background: `${accent}33`,
        },
    };
}

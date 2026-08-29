import type { CSSProperties } from 'react';
import type { ShapeKey } from '@/app/types/common';
import { defaultMainSpan } from './homeWidgetPlacements';
import { normalizeGlassOpacity, normalizeBackgroundPatternOpacity } from './surfaceAppearance';
import { contentScaleVar, resolveContentScale } from './homeBlockScale';
import { resolveCardThemeBg, resolveCardThemePrimary } from './themeResolve';
import type { AppearanceSettings } from './types';
import { mergeBlockScopedAppearance } from './themeResolve';
import { resolveLawyerDashboardCanvasBg } from './boardSurfaceResolve';
import { loadPersistedWallpaper } from './apply';
import { resolveGlassPanelBackground, tintHex, resolveGlassPatternScale } from './glassSurfacePaint';
import type {
    HomeBlockPattern,
    HomeBlockShape,
    HomeBlockSize,
    HomeBlockStyleOverride,
} from './homeLayout';

const SHAPE_RADIUS: Record<HomeBlockShape, string> = {
    pill: 'rounded-[2rem]',
    rounded: 'rounded-[1.625rem]',
    sharp: 'rounded-xl',
    circle: 'rounded-[2.5rem]',
};

const PATTERN_CLASS: Record<HomeBlockPattern, string> = {
    glass: 'hami-sovereign-glass hami-sovereign-rim hami-home-themed-border',
    solid: 'hami-home-block-solid',
    gradient: 'hami-home-block-gradient',
    rim: 'hami-sovereign-rim hami-home-themed-border bg-black/35',
    minimal: 'hami-home-block-minimal',
};

const SIZE_CLASS: Record<HomeBlockSize, string> = {
    compact: 'hami-home-block-compact',
    normal: '',
    large: 'hami-home-block-large',
};

/** ShapeKey العالمي (إعدادات) → HomeBlockShape (بطاقات) */
export function shapeKeyToHomeBlockShape(shape: ShapeKey): HomeBlockShape {
    if (shape === 'square') return 'sharp';
    return shape as HomeBlockShape;
}

function resolveGlobalBlockShape(
    override: HomeBlockStyleOverride | undefined,
    globalShape?: ShapeKey,
): HomeBlockShape {
    if (override?.shape) return override.shape;
    if (globalShape) return shapeKeyToHomeBlockShape(globalShape);
    return 'rounded';
}

export function resolveHomeBlockClassNames(
    override?: HomeBlockStyleOverride,
    globalShape?: ShapeKey,
): string {
    const shape = resolveGlobalBlockShape(override, globalShape);
    const pattern = override?.pattern ?? 'solid';
    const size = override?.size ?? 'normal';
    return [SHAPE_RADIUS[shape], PATTERN_CLASS[pattern], SIZE_CLASS[size]].filter(Boolean).join(' ');
}

export function resolveHomeBlockAccent(override: HomeBlockStyleOverride | undefined, themePrimary: string): string {
    const custom = override?.accentColor?.trim();
    return custom && custom.length > 0 ? custom : themePrimary;
}

export function resolveBlockPatternOpacity(
    override: HomeBlockStyleOverride | undefined,
    appearance: { backgroundPatternOpacity?: number },
): number {
    if (override?.patternOpacity !== undefined) {
        return normalizeBackgroundPatternOpacity(override.patternOpacity);
    }
    return normalizeBackgroundPatternOpacity(appearance.backgroundPatternOpacity);
}

export function resolveHomeBlockInlineStyle(
    override: HomeBlockStyleOverride | undefined,
    themePrimary: string,
    opts?: {
        baseMinHeightPx?: number;
        skipHeightPx?: boolean;
        skipContentScale?: boolean;
        skipGlassPaint?: boolean;
        defaultGlassOpacity?: number;
        appearance?: Pick<AppearanceSettings, 'theme' | 'cardTheme' | 'patternTheme' | 'brandColor' | 'themeMode'>;
    },
): CSSProperties {
    const scopedAppearance =
        opts?.appearance != null ? mergeBlockScopedAppearance(opts.appearance as AppearanceSettings, override) : undefined;
    const accent =
        scopedAppearance != null
            ? resolveCardThemePrimary(scopedAppearance)
            : resolveHomeBlockAccent(override, themePrimary);
    const scale = resolveContentScale(
        override,
        opts?.baseMinHeightPx,
        opts?.skipHeightPx ?? false,
    );
    const style: CSSProperties = {
        ['--hami-block-accent' as string]: accent,
    };

    const glassOpacity =
        override?.glassOpacity !== undefined
            ? normalizeGlassOpacity(override.glassOpacity)
            : opts?.defaultGlassOpacity !== undefined
              ? normalizeGlassOpacity(opts.defaultGlassOpacity)
              : undefined;

    const blockSurfaceHex = scopedAppearance
        ? tintHex(resolveCardThemeBg(scopedAppearance), resolveCardThemePrimary(scopedAppearance), 0.16)
        : tintHex('#0A0F1C', themePrimary, 0.16);

    Object.assign(style, {
        '--hami-block-surface-bg': blockSurfaceHex,
        '--hami-glass-base': blockSurfaceHex,
    });

    if (glassOpacity !== undefined && !opts?.skipGlassPaint) {
        const hasWallpaper = Boolean(loadPersistedWallpaper());
        const boardBg = scopedAppearance
            ? resolveLawyerDashboardCanvasBg(
                  { theme: scopedAppearance.theme, themeMode: opts?.appearance?.themeMode ?? 'dark' },
                  hasWallpaper,
              )
            : '#0A0F1C';
        const panelBg = resolveGlassPanelBackground(blockSurfaceHex, boardBg, glassOpacity, hasWallpaper);
        Object.assign(style, {
            '--glass-opacity': String(glassOpacity),
            '--hami-glass-panel-bg': panelBg,
            '--hami-glass-pattern-scale': String(resolveGlassPatternScale(glassOpacity)),
        });
    }

    if (!opts?.skipContentScale) {
        Object.assign(style, contentScaleVar(scale));
    }
    if (override?.heightPx && !opts?.skipHeightPx) {
        style.minHeight = override.heightPx;
    }
    return style;
}

export function resolveWidgetSpan(
    widgetId: import('./homeWidgetPlacements').HomeWidgetId,
    override?: HomeBlockStyleOverride,
): 1 | 2 {
    if (override?.span === 1 || override?.span === 2) return override.span;
    return defaultMainSpan(widgetId);
}

export function resolveHubTileMinHeight(
    tileId: 'hubExecution' | 'hubLawsuit' | 'hubTransaction' | 'forum' | 'alerts',
    size: HomeBlockSize = 'normal',
): string {
    const map = {
        hubExecution: { compact: 'min-h-[5rem]', normal: 'min-h-[5rem]', large: 'min-h-[5.5rem]' },
        hubLawsuit: { compact: 'min-h-[5rem]', normal: 'min-h-[5rem]', large: 'min-h-[5.5rem]' },
        hubTransaction: { compact: 'min-h-[5rem]', normal: 'min-h-[5rem]', large: 'min-h-[5.5rem]' },
        forum: { compact: 'min-h-[5rem]', normal: 'min-h-[5rem]', large: 'min-h-[5.5rem]' },
        alerts: { compact: 'min-h-[5rem]', normal: 'min-h-[5rem]', large: 'min-h-[5.5rem]' },
    };
    return map[tileId][size];
}

export function resolveAlertsMinHeight(size: HomeBlockSize = 'normal'): string {
    return { compact: 'min-h-[180px]', normal: 'min-h-[240px]', large: 'min-h-[300px]' }[size];
}

/** ارتفاع الغلاف حسب نوع البطاقة */
export function resolveWidgetWrapperStyle(
    widgetId: import('./homeWidgetPlacements').HomeWidgetId,
    override: HomeBlockStyleOverride | undefined,
    themePrimary: string,
    zone?: import('./homeWidgetPlacements').HomeWidgetZone,
    defaultGlassOpacity?: number,
    appearance?: AppearanceSettings,
): CSSProperties {
    const inDock = zone === 'dock';
    const baseHeights: Partial<Record<import('./homeWidgetPlacements').HomeWidgetId, number>> = {
        alerts: 88,
        hubExecution: 120,
        hubLawsuit: 88,
        hubTransaction: 88,
        forum: 88,
        dockNotepad: 100,
        dockCalendar: 100,
        dockVault: 100,
        dockTasks: 100,
        dockQuickNote: 100,
    };
    const scoped = appearance ? mergeBlockScopedAppearance(appearance, override) : undefined;
    const style = resolveHomeBlockInlineStyle(override, themePrimary, {
        baseMinHeightPx: baseHeights[widgetId],
        skipHeightPx: inDock,
        skipGlassPaint: true,
        defaultGlassOpacity,
        appearance: scoped,
    });
    return style;
}

export function isBlockVisible(override?: HomeBlockStyleOverride, defaultVisible = true): boolean {
    if (override?.visible === false) return false;
    return defaultVisible;
}

export function resolveBlockContainerBorder(
    override: HomeBlockStyleOverride | undefined,
    globalEnabled: boolean,
): boolean {
    if (override?.containerBorder === true) return true;
    if (override?.containerBorder === false) return false;
    return globalEnabled;
}

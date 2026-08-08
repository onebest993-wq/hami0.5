import type { CSSProperties } from 'react';
import type { ShapeKey } from '@/app/types/common';
import type { HomeBlockStyleOverride, HomeBlockShape, HomeBlockPattern, HomeBlockSize } from './homeLayout';
import { normalizeGlassOpacity, normalizeBackgroundPatternOpacity } from './surfaceAppearance';
import { contentScaleVar, resolveContentScale } from './homeBlockScale';
import { defaultMainSpan, type HomeWidgetId, type HomeWidgetZone } from './homeWidgetPlacements';
import { resolveCardThemeBg, resolveCardThemePrimary } from './themeResolve';
import type { AppearanceSettings } from './types';
import { mergeBlockScopedAppearance } from './themeResolve';
import { resolveLawyerDashboardCanvasBg } from './boardSurfaceResolve';
import { loadPersistedWallpaper } from './apply';
import { resolveGlassPanelBackground, tintHex, resolveGlassPatternScale } from './glassSurfacePaint';

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

export function resolveGlobalBlockShape(
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
    const pattern = override?.pattern ?? 'glass';
    const size = override?.size ?? 'normal';
    return [SHAPE_RADIUS[shape], PATTERN_CLASS[pattern], SIZE_CLASS[size]].filter(Boolean).join(' ');
}

export function resolveHomeBlockShapeClass(
    override?: HomeBlockStyleOverride,
    globalShape?: ShapeKey,
): string {
    return SHAPE_RADIUS[resolveGlobalBlockShape(override, globalShape)];
}

export function shouldShowHomeBlockSheen(_pattern?: HomeBlockPattern): boolean {
    return false;
}

export function shouldShowHomeMoroccanGlassDecor(pattern?: HomeBlockPattern): boolean {
    const resolved = pattern ?? 'glass';
    return resolved === 'glass' || resolved === 'rim' || resolved === 'gradient';
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

export function resolveBlockGlassDecorOpacity(
    _override: HomeBlockStyleOverride | undefined,
    _appearance: { backgroundPatternOpacity?: number },
): number {
    /* ثابت — غسيل الزجاج لا يختفي عند خفض حدة الزخرفة */
    return 0.48;
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
    if (widgetId === 'alerts') return 2;
    return 1;
}

export function resolveHubTileMinHeight(
    tileId: 'hubExecution' | 'hubLawsuit' | 'hubTransaction' | 'forum',
    size: HomeBlockSize = 'normal',
): string {
    const map = {
        hubExecution: { compact: 'min-h-[6.25rem]', normal: 'min-h-[6.25rem]', large: 'min-h-[7rem]' },
        hubLawsuit: { compact: 'min-h-[6.25rem]', normal: 'min-h-[6.25rem]', large: 'min-h-[7rem]' },
        hubTransaction: { compact: 'min-h-[6.25rem]', normal: 'min-h-[6.25rem]', large: 'min-h-[7rem]' },
        forum: { compact: 'min-h-[6.25rem]', normal: 'min-h-[6.25rem]', large: 'min-h-[7rem]' },
    };
    return map[tileId][size];
}

export function resolveAlertsMinHeight(size: HomeBlockSize = 'normal'): string {
    return { compact: 'min-h-[180px]', normal: 'min-h-[240px]', large: 'min-h-[300px]' }[size];
}

/** بطاقات لا يُطبَّق عليها ضغط الارتفاع اليدوي — لحماية المحتوى */
export const HEIGHT_PROTECTED_WIDGET_IDS = ['alerts'] as const;

/** الحد الأدنى لارتفاع البطاقة عند السحب اليدوي */
export function resolveWidgetResizeMinHeight(
    widgetId: import('./homeWidgetPlacements').HomeWidgetId,
): number {
    const map: Partial<Record<import('./homeWidgetPlacements').HomeWidgetId, number>> = {
        hubExecution: 108,
        hubLawsuit: 120,
        hubTransaction: 120,
        forum: 100,
        alerts: 180,
        dockNotepad: 88,
        dockCalendar: 88,
        dockVault: 88,
        dockTasks: 88,
        dockQuickNote: 88,
    };
    return map[widgetId] ?? 88;
}

export function isHeightProtectedWidget(
    widgetId: import('./homeWidgetPlacements').HomeWidgetId,
): boolean {
    return (HEIGHT_PROTECTED_WIDGET_IDS as readonly string[]).includes(widgetId);
}

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
        alerts: 240,
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
        skipHeightPx: isHeightProtectedWidget(widgetId) || inDock,
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

/** تكييف الأبعاد عند نقل عنصر بين الشبكة الرئيسية والشريط السفلي */
export function adaptWidgetStyleForZoneChange(
    widgetId: HomeWidgetId,
    override: HomeBlockStyleOverride | undefined,
    toZone: HomeWidgetZone,
): HomeBlockStyleOverride | undefined {
    if (!override) {
        return toZone === 'dock' ? { size: 'compact' } : undefined;
    }

    const preserved = {
        accentColor: override.accentColor,
        cardTheme: override.cardTheme,
        patternTheme: override.patternTheme,
        shape: override.shape,
        pattern: override.pattern,
        visible: override.visible,
        backgroundPreset: override.backgroundPreset,
        glassOpacity: override.glassOpacity,
        patternOpacity: override.patternOpacity,
        containerBorder: override.containerBorder,
        span: override.span,
        heightPx: override.heightPx,
        size: override.size,
    };

    if (toZone === 'dock') {
        return { ...preserved, size: 'compact' as HomeBlockSize };
    }

    return {
        ...preserved,
        size: (override.size === 'large' ? 'large' : override.size === 'compact' ? 'compact' : 'normal') as HomeBlockSize,
        span: override.span ?? defaultMainSpan(widgetId),
    };
}

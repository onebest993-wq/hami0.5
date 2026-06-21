import type { CSSProperties } from 'react';
import type { HomeBlockStyleOverride, HomeBlockShape, HomeBlockPattern, HomeBlockSize } from './homeLayout';
import { normalizeGlassOpacity } from './surfaceAppearance';
import { contentScaleVar, resolveContentScale } from './homeBlockScale';
import { defaultMainSpan, type HomeWidgetId, type HomeWidgetZone } from './homeWidgetPlacements';

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

export function resolveHomeBlockClassNames(override?: HomeBlockStyleOverride): string {
    const shape = override?.shape ?? 'rounded';
    const pattern = override?.pattern ?? 'glass';
    const size = override?.size ?? 'normal';
    return [SHAPE_RADIUS[shape], PATTERN_CLASS[pattern], SIZE_CLASS[size]].filter(Boolean).join(' ');
}

export function resolveHomeBlockShapeClass(override?: HomeBlockStyleOverride): string {
    return SHAPE_RADIUS[override?.shape ?? 'rounded'];
}

export function shouldShowHomeBlockSheen(pattern?: HomeBlockPattern): boolean {
    const resolved = pattern ?? 'glass';
    return resolved === 'glass' || resolved === 'rim' || resolved === 'gradient';
}

export function resolveHomeBlockAccent(override: HomeBlockStyleOverride | undefined, themePrimary: string): string {
    const custom = override?.accentColor?.trim();
    return custom && custom.length > 0 ? custom : themePrimary;
}

export function resolveHomeBlockInlineStyle(
    override: HomeBlockStyleOverride | undefined,
    themePrimary: string,
    opts?: {
        baseMinHeightPx?: number;
        skipHeightPx?: boolean;
        skipContentScale?: boolean;
        defaultGlassOpacity?: number;
    },
): CSSProperties {
    const accent = resolveHomeBlockAccent(override, themePrimary);
    const scale = resolveContentScale(
        override,
        opts?.baseMinHeightPx,
        opts?.skipHeightPx ?? false,
    );
    const style: CSSProperties = {
        ['--hami-block-accent' as string]: accent,
    };
    if (!opts?.skipContentScale) {
        Object.assign(style, contentScaleVar(scale));
    }
    const glassOpacity =
        override?.glassOpacity !== undefined
            ? normalizeGlassOpacity(override.glassOpacity)
            : opts?.defaultGlassOpacity !== undefined
              ? normalizeGlassOpacity(opts.defaultGlassOpacity)
              : undefined;
    if (glassOpacity !== undefined) {
        style['--glass-opacity' as string] = String(glassOpacity);
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
    if (widgetId === 'alerts' || widgetId === 'forum') return 2;
    if (widgetId === 'hubExecution' || widgetId === 'dockQuickNote') return 2;
    return 1;
}

export function resolveHubTileMinHeight(
    tileId: 'hubExecution' | 'hubLawsuit' | 'hubTransaction',
    size: HomeBlockSize = 'normal',
): string {
    const map = {
        hubExecution: { compact: 'min-h-[160px]', normal: 'min-h-[196px]', large: 'min-h-[240px]' },
        hubLawsuit: { compact: 'min-h-[128px]', normal: 'min-h-[156px]', large: 'min-h-[188px]' },
        hubTransaction: { compact: 'min-h-[128px]', normal: 'min-h-[156px]', large: 'min-h-[188px]' },
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
        hubExecution: 140,
        hubLawsuit: 120,
        hubTransaction: 120,
        forum: 88,
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
): CSSProperties {
    const inDock = zone === 'dock';
    const baseHeights: Partial<Record<import('./homeWidgetPlacements').HomeWidgetId, number>> = {
        alerts: 240,
        hubExecution: 196,
        hubLawsuit: 156,
        hubTransaction: 156,
        forum: 96,
        dockNotepad: 100,
        dockCalendar: 100,
        dockVault: 100,
        dockTasks: 100,
        dockQuickNote: 100,
    };
    const style = resolveHomeBlockInlineStyle(override, themePrimary, {
        baseMinHeightPx: baseHeights[widgetId],
        skipHeightPx: isHeightProtectedWidget(widgetId) || inDock,
        defaultGlassOpacity,
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

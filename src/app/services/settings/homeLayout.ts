/** تخصيص لوحة القيادة — ترتيب، حجم، لون، نقل بين المناطق */

export {
    HOME_WIDGET_IDS,
    type HomeWidgetId,
    type HomeWidgetZone,
    type HomeWidgetPlacement,
    type HomeWidgetPlacements,
    buildDefaultPlacements,
    CANONICAL_MAIN_WIDGET_ORDER,
    applyCanonicalMainWidgetOrder,
    getWidgetsInZone,
    getWidgetZone,
    isDockCompactWidget,
    transferWidget,
    reorderWidgetInZone,
    computeInsertIndex,
    migrateLegacyOrdersToPlacements,
    defaultMainSpan,
    isHomeWidgetId,
    REPOSITORY_LEGACY_WIDGET_IDS,
    isRepositoryLegacyWidget,
    filterDisplayHomeWidgets,
} from './homeWidgetPlacements';

import { isDockShellOrderWidget } from './homeWidgetPlacements';
import type { HomeWidgetId, HomeWidgetPlacements } from './homeWidgetPlacements';
import {
    buildDefaultPlacements,
    applyCanonicalMainWidgetOrder,
    getWidgetsInZone,
    migrateLegacyOrdersToPlacements,
} from './homeWidgetPlacements';
import { evacuateDockShellIconsToMain } from './homeLayoutDockControls';
import {
    normalizeBackgroundPatternOpacity,
    normalizeGlassOpacity,
} from './surfaceAppearance';
import type { BackgroundPresetId } from './backgroundPresets';
import { LAWYER_THEME_TOKENS } from './lawyerThemeTokens';
import type { ThemeKey } from '@/app/types/common';

const HOME_SCROLL_BLOCK_IDS = ['alerts', 'hub', 'forum'] as const;
export type HomeScrollBlockId = (typeof HOME_SCROLL_BLOCK_IDS)[number];

const HOME_HUB_TILE_IDS = ['hubExecution', 'hubLawsuit', 'hubTransaction'] as const;
export type HomeHubTileId = (typeof HOME_HUB_TILE_IDS)[number];

const DOCK_ITEM_IDS = ['dockRepository', 'dockCalendar', 'dockTasks', 'dockQuickNote'] as const;
export type DockItemId = (typeof DOCK_ITEM_IDS)[number];

export type HomeCustomizableId = HomeScrollBlockId | HomeHubTileId | DockItemId | 'dockShell';

export type HomeBlockSize = 'compact' | 'normal' | 'large';
export type HomeBlockShape = 'pill' | 'rounded' | 'sharp' | 'circle';
export type HomeBlockPattern = 'glass' | 'solid' | 'gradient' | 'rim' | 'minimal';

export interface HomeBlockStyleOverride {
    accentColor?: string;
    /** لون بطاقة هذا القسم — يتجاوز cardTheme العام */
    cardTheme?: ThemeKey;
    /** لون نقوش هذا القسم — يتجاوز patternTheme العام */
    patternTheme?: ThemeKey;
    shape?: HomeBlockShape;
    pattern?: HomeBlockPattern;
    size?: HomeBlockSize;
    visible?: boolean;
    span?: 1 | 2;
    heightPx?: number;
    backgroundPreset?: BackgroundPresetId;
    /** كثافة الحاوية — شفافية/كثافة الزجاج (0–1) */
    glassOpacity?: number;
    /** حدة الزخرفة على هذه البطاقة (0–0.78) */
    patternOpacity?: number;
    /** إطار الحاوية — undefined = من الإعدادات العامة */
    containerBorder?: boolean;
    /** رفع/خفض عن موضعه الافتراضي (px) — dockShell (الحاوية) أو dockQuickNote (شريط الملاحظة) */
    dockLiftPx?: number;
}

export interface HomeLayoutSettings {
    placements: HomeWidgetPlacements;
    scrollOrder?: HomeScrollBlockId[];
    hubTileOrder?: HomeHubTileId[];
    dockItemOrder?: DockItemId[];
    dockVisible: boolean;
    /** إظهار شريط «تحدث أو اكتب» */
    quickNoteVisible?: boolean;
    /** ترتيب عناصر الدوك قبل الإخفاء — لاستعادتها */
    dockHiddenWidgetIds?: HomeWidgetId[];
    overrides: Partial<Record<HomeCustomizableId | HomeWidgetId, HomeBlockStyleOverride>>;
}

export const HOME_LAYOUT_DEFAULTS: HomeLayoutSettings = {
    placements: buildDefaultPlacements(),
    dockVisible: true,
    quickNoteVisible: false,
    dockHiddenWidgetIds: [],
    overrides: {},
};

function normalizeOverride(raw: unknown): HomeBlockStyleOverride | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    const out: HomeBlockStyleOverride = {};
    if (typeof o.accentColor === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(o.accentColor)) {
        out.accentColor = o.accentColor;
    }
    const themeKeys = new Set(Object.keys(LAWYER_THEME_TOKENS));
    if (typeof o.cardTheme === 'string' && themeKeys.has(o.cardTheme)) {
        out.cardTheme = o.cardTheme as ThemeKey;
    }
    if (typeof o.patternTheme === 'string' && themeKeys.has(o.patternTheme)) {
        out.patternTheme = o.patternTheme as ThemeKey;
    }
    if (o.shape === 'pill' || o.shape === 'rounded' || o.shape === 'sharp' || o.shape === 'circle') {
        out.shape = o.shape;
    }
    if (
        o.pattern === 'glass' ||
        o.pattern === 'solid' ||
        o.pattern === 'gradient' ||
        o.pattern === 'rim' ||
        o.pattern === 'minimal'
    ) {
        out.pattern = o.pattern;
    }
    if (o.size === 'compact' || o.size === 'normal' || o.size === 'large') {
        out.size = o.size;
    }
    if (typeof o.visible === 'boolean') out.visible = o.visible;
    if (o.span === 1 || o.span === 2) out.span = o.span;
    if (typeof o.heightPx === 'number' && o.heightPx >= 72 && o.heightPx <= 480) {
        out.heightPx = Math.round(o.heightPx);
    }
    if (typeof o.backgroundPreset === 'string') out.backgroundPreset = o.backgroundPreset as BackgroundPresetId;
    if (typeof o.glassOpacity === 'number' && !Number.isNaN(o.glassOpacity)) {
        out.glassOpacity = normalizeGlassOpacity(o.glassOpacity);
    }
    if (typeof o.patternOpacity === 'number' && !Number.isNaN(o.patternOpacity)) {
        out.patternOpacity = normalizeBackgroundPatternOpacity(o.patternOpacity);
    }
    if (typeof o.containerBorder === 'boolean') out.containerBorder = o.containerBorder;
    if (typeof o.dockLiftPx === 'number' && !Number.isNaN(o.dockLiftPx)) {
        out.dockLiftPx = Math.max(-120, Math.min(160, Math.round(o.dockLiftPx)));
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

const FLAT_HALF_TILE_IDS = ['forum'] as const;

function flattenLegacyFullRowTiles(
    overrides: HomeLayoutSettings['overrides'],
): HomeLayoutSettings['overrides'] {
    let next = overrides;
    for (const id of FLAT_HALF_TILE_IDS) {
        const current = next[id];
        if (current?.span !== 2) continue;
        if (next === overrides) next = { ...overrides };
        const rest = { ...current };
        delete rest.span;
        if (Object.keys(rest).length > 0) next[id] = rest;
        else delete next[id];
    }
    return next;
}

export function normalizeHomeLayout(raw: unknown): HomeLayoutSettings {
    if (!raw || typeof raw !== 'object') return { ...HOME_LAYOUT_DEFAULTS, overrides: {} };
    const obj = raw as Partial<HomeLayoutSettings> & { sectionOrder?: unknown };

    const placements = migrateLegacyOrdersToPlacements({
        scrollOrder: obj.scrollOrder ?? obj.sectionOrder,
        hubTileOrder: obj.hubTileOrder,
        dockItemOrder: obj.dockItemOrder,
        placements: obj.placements,
    });

    let overrides: HomeLayoutSettings['overrides'] = {};
    if (obj.overrides && typeof obj.overrides === 'object') {
        for (const [key, val] of Object.entries(obj.overrides)) {
            const normalized = normalizeOverride(val);
            if (normalized) overrides[key as HomeCustomizableId] = normalized;
        }
    }
    overrides = flattenLegacyFullRowTiles(overrides);

    const quickNoteVisible =
        typeof obj.quickNoteVisible === 'boolean' ? obj.quickNoteVisible : false;

    let dockHiddenWidgetIds = Array.isArray(obj.dockHiddenWidgetIds)
        ? obj.dockHiddenWidgetIds.filter(
              (id): id is HomeWidgetId => typeof id === 'string' && isDockShellOrderWidget(id as HomeWidgetId),
          )
        : [];

    const shellStillInDock = getWidgetsInZone(placements, 'dock').some(isDockShellOrderWidget);
    let resolvedPlacements = placements;
    if (shellStillInDock) {
        const evacuated = evacuateDockShellIconsToMain(resolvedPlacements);
        resolvedPlacements = evacuated.placements;
        dockHiddenWidgetIds = [...dockHiddenWidgetIds, ...evacuated.dockHiddenWidgetIds];
    }
    resolvedPlacements = applyCanonicalMainWidgetOrder(resolvedPlacements);

    /** الشريط السفلي أُزيل — أيقونات الدوك في الشبكة الرئيسية */
    const dockVisible = false;

    return {
        placements: resolvedPlacements,
        dockVisible,
        quickNoteVisible,
        dockHiddenWidgetIds,
        overrides,
    };
}

/** تخصيص لوحة القيادة — ترتيب، حجم، لون، نقل بين المناطق */

export {
    HOME_WIDGET_IDS,
    type HomeWidgetId,
    type HomeWidgetZone,
    type HomeWidgetPlacement,
    type HomeWidgetPlacements,
    buildDefaultPlacements,
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
    getWidgetsInZone,
    migrateLegacyOrdersToPlacements,
} from './homeWidgetPlacements';
import {
    normalizeBackgroundPatternOpacity,
    normalizeGlassOpacity,
} from './surfaceAppearance';
import type { BackgroundPresetId } from './backgroundPresets';

export const HOME_SCROLL_BLOCK_IDS = ['alerts', 'hub', 'forum'] as const;
export type HomeScrollBlockId = (typeof HOME_SCROLL_BLOCK_IDS)[number];

export const HOME_HUB_TILE_IDS = ['hubExecution', 'hubLawsuit', 'hubTransaction'] as const;
export type HomeHubTileId = (typeof HOME_HUB_TILE_IDS)[number];

export const DOCK_ITEM_IDS = ['dockRepository', 'dockNotepad', 'dockCalendar', 'dockVault', 'dockTasks', 'dockQuickNote'] as const;
export type DockItemId = (typeof DOCK_ITEM_IDS)[number];

export type HomeCustomizableId = HomeScrollBlockId | HomeHubTileId | DockItemId | 'dockShell';

export type HomeBlockSize = 'compact' | 'normal' | 'large';
export type HomeBlockShape = 'pill' | 'rounded' | 'sharp' | 'circle';
export type HomeBlockPattern = 'glass' | 'solid' | 'gradient' | 'rim' | 'minimal';

export interface HomeBlockStyleOverride {
    accentColor?: string;
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

export const HOME_SCROLL_ORDER_DEFAULT: HomeScrollBlockId[] = [...HOME_SCROLL_BLOCK_IDS];
export const HOME_HUB_TILE_ORDER_DEFAULT: HomeHubTileId[] = [...HOME_HUB_TILE_IDS];
export const DOCK_ITEM_ORDER_DEFAULT: DockItemId[] = [...DOCK_ITEM_IDS];

export const HOME_LAYOUT_DEFAULTS: HomeLayoutSettings = {
    placements: buildDefaultPlacements(),
    dockVisible: true,
    quickNoteVisible: false,
    dockHiddenWidgetIds: [],
    overrides: {},
};

export const HOME_BLOCK_ACCENT_PRESETS = [
    { id: 'inherit', label: 'من الثيم', color: '' },
    { id: 'gold', label: 'ذهبي', color: '#E6C673' },
    { id: 'emerald', label: 'زمردي', color: '#34D399' },
    { id: 'rose', label: 'نحاسي', color: '#D4A574' },
    { id: 'cyan', label: 'سماوي', color: '#67E8F9' },
    { id: 'violet', label: 'بنفسجي', color: '#A78BFA' },
] as const;

function normalizeOverride(raw: unknown): HomeBlockStyleOverride | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const o = raw as Record<string, unknown>;
    const out: HomeBlockStyleOverride = {};
    if (typeof o.accentColor === 'string' && /^#[0-9A-Fa-f]{3,8}$/.test(o.accentColor)) {
        out.accentColor = o.accentColor;
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

export function normalizeHomeLayout(raw: unknown): HomeLayoutSettings {
    if (!raw || typeof raw !== 'object') return { ...HOME_LAYOUT_DEFAULTS, overrides: {} };
    const obj = raw as Partial<HomeLayoutSettings> & { sectionOrder?: unknown };

    const placements = migrateLegacyOrdersToPlacements({
        scrollOrder: obj.scrollOrder ?? obj.sectionOrder,
        hubTileOrder: obj.hubTileOrder,
        dockItemOrder: obj.dockItemOrder,
        placements: obj.placements,
    });

    const overrides: HomeLayoutSettings['overrides'] = {};
    if (obj.overrides && typeof obj.overrides === 'object') {
        for (const [key, val] of Object.entries(obj.overrides)) {
            const normalized = normalizeOverride(val);
            if (normalized) overrides[key as HomeCustomizableId] = normalized;
        }
    }

    const dockVisible =
        typeof obj.dockVisible === 'boolean'
            ? obj.dockVisible
            : getWidgetsInZone(placements, 'dock').filter(isDockShellOrderWidget).length > 0;

    const quickNoteVisible =
        typeof obj.quickNoteVisible === 'boolean' ? obj.quickNoteVisible : false;

    const dockHiddenWidgetIds = Array.isArray(obj.dockHiddenWidgetIds)
        ? obj.dockHiddenWidgetIds.filter(
              (id): id is HomeWidgetId => typeof id === 'string' && isDockShellOrderWidget(id as HomeWidgetId),
          )
        : [];

    const resolvedPlacements = placements;

    return {
        placements: resolvedPlacements,
        dockVisible,
        quickNoteVisible,
        dockHiddenWidgetIds,
        overrides,
    };
}

export function moveOrderItem<T>(order: T[], index: number, direction: -1 | 1): T[] {
    const next = [...order];
    const target = index + direction;
    if (target < 0 || target >= next.length) return order;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
}

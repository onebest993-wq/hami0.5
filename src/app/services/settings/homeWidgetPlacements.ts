import type { BackgroundPresetId } from './backgroundPresets';
import type { DockItemId } from './homeLayout';

/** كل عناصر الواجهة القابلة للنقل بين المناطق */
export const HOME_WIDGET_IDS = [
    'alerts',
    'hubExecution',
    'hubLawsuit',
    'hubTransaction',
    'forum',
    'dockRepository',
    'dockNotepad',
    'dockCalendar',
    'dockVault',
    'dockTasks',
    'dockQuickNote',
] as const;

export type HomeWidgetId = (typeof HOME_WIDGET_IDS)[number];

export type HomeWidgetZone = 'main' | 'dock';

export interface HomeWidgetPlacement {
    zone: HomeWidgetZone;
    order: number;
}

export type HomeWidgetPlacements = Record<HomeWidgetId, HomeWidgetPlacement>;

/** دُمجت في المستودع الذكي — تُخفى من العرض العادي وتبقى في وضع تخصيص التخطيط */
export const REPOSITORY_LEGACY_WIDGET_IDS = ['dockNotepad', 'dockVault'] as const satisfies readonly HomeWidgetId[];

export type RepositoryLegacyWidgetId = (typeof REPOSITORY_LEGACY_WIDGET_IDS)[number];

export function isRepositoryLegacyWidget(id: HomeWidgetId): id is RepositoryLegacyWidgetId {
    return (REPOSITORY_LEGACY_WIDGET_IDS as readonly HomeWidgetId[]).includes(id);
}

export function filterDisplayHomeWidgets(
    ids: HomeWidgetId[],
    layoutEditMode: boolean,
): HomeWidgetId[] {
    if (layoutEditMode) return ids;
    return ids.filter((id) => !isRepositoryLegacyWidget(id));
}

export function buildDefaultPlacements(): HomeWidgetPlacements {
    return {
        alerts: { zone: 'main', order: 0 },
        hubExecution: { zone: 'main', order: 1 },
        hubLawsuit: { zone: 'main', order: 2 },
        hubTransaction: { zone: 'main', order: 3 },
        forum: { zone: 'main', order: 4 },
        dockRepository: { zone: 'dock', order: 0 },
        dockNotepad: { zone: 'dock', order: 98 },
        dockCalendar: { zone: 'dock', order: 1 },
        dockVault: { zone: 'dock', order: 99 },
        dockTasks: { zone: 'dock', order: 2 },
        dockQuickNote: { zone: 'dock', order: 3 },
    };
}

export function isHomeWidgetId(id: string): id is HomeWidgetId {
    return (HOME_WIDGET_IDS as readonly string[]).includes(id);
}

/** عناصر الدوك — لا تُحسب في ترتيب أيقونات الشريط */
export const DOCK_SHELL_WIDGET_IDS: HomeWidgetId[] = ['dockQuickNote'];

export function isDockShellOrderWidget(id: HomeWidgetId): boolean {
    return !DOCK_SHELL_WIDGET_IDS.includes(id) && !isRepositoryLegacyWidget(id);
}

/** عناصر الدوك الأصلية — أيقونة + تسمية فقط */
export function isDockCompactWidget(id: HomeWidgetId): boolean {
    return (
        id === 'dockRepository' ||
        id === 'dockNotepad' ||
        id === 'dockCalendar' ||
        id === 'dockVault' ||
        id === 'dockTasks' ||
        id === 'dockQuickNote'
    );
}

export function getWidgetZone(
    placements: HomeWidgetPlacements,
    widgetId: HomeWidgetId,
): HomeWidgetZone {
    return placements[widgetId]?.zone ?? 'main';
}

export function getWidgetsInZone(
    placements: HomeWidgetPlacements,
    zone: HomeWidgetZone,
): HomeWidgetId[] {
    return HOME_WIDGET_IDS.filter((id) => placements[id]?.zone === zone).sort(
        (a, b) => (placements[a]?.order ?? 0) - (placements[b]?.order ?? 0),
    );
}

/** إعادة ترقيم order داخل منطقة */
function reindexZone(placements: HomeWidgetPlacements, zone: HomeWidgetZone): HomeWidgetPlacements {
    const ids = getWidgetsInZone(placements, zone);
    const next = { ...placements };
    ids.forEach((id, index) => {
        next[id] = { zone, order: index };
    });
    return next;
}

/** نقل عنصر إلى منطقة أخرى مع موضع إدراج */
export function transferWidget(
    placements: HomeWidgetPlacements,
    widgetId: HomeWidgetId,
    targetZone: HomeWidgetZone,
    insertIndex: number,
): HomeWidgetPlacements {
    const sourceZone = placements[widgetId]?.zone ?? 'main';
    let next = { ...placements };

    const sourceIds = getWidgetsInZone(next, sourceZone).filter((id) => id !== widgetId);
    sourceIds.forEach((id, i) => {
        next[id] = { zone: sourceZone, order: i };
    });

    const targetIds = getWidgetsInZone(next, targetZone).filter((id) => id !== widgetId);
    const clamped = Math.max(0, Math.min(insertIndex, targetIds.length));
    targetIds.splice(clamped, 0, widgetId);
    targetIds.forEach((id, i) => {
        next[id] = { zone: targetZone, order: i };
    });

    next[widgetId] = { zone: targetZone, order: clamped };
    next = reindexZone(next, sourceZone);
    next = reindexZone(next, targetZone);
    return next;
}

export function reorderWidgetInZone(
    placements: HomeWidgetPlacements,
    widgetId: HomeWidgetId,
    newIndex: number,
): HomeWidgetPlacements {
    const zone = placements[widgetId]?.zone ?? 'main';
    const ids = getWidgetsInZone(placements, zone);
    const from = ids.indexOf(widgetId);
    if (from < 0) return placements;
    const nextIds = [...ids];
    nextIds.splice(from, 1);
    const clamped = Math.max(0, Math.min(newIndex, nextIds.length));
    nextIds.splice(clamped, 0, widgetId);
    let next = { ...placements };
    nextIds.forEach((id, i) => {
        next[id] = { zone, order: i };
    });
    return next;
}

/** حساب موضع الإدراج من إحداثيات المؤشر */
export function computeInsertIndex(
    pointer: number,
    bounds: Array<{ id: HomeWidgetId; start: number; end: number }>,
    axis: 'x' | 'y',
): number {
    if (bounds.length === 0) return 0;
    for (let i = 0; i < bounds.length; i++) {
        const mid = (bounds[i].start + bounds[i].end) / 2;
        if (pointer < mid) return i;
    }
    return bounds.length;
}

export function migrateLegacyOrdersToPlacements(raw: {
    scrollOrder?: unknown;
    hubTileOrder?: unknown;
    dockItemOrder?: unknown;
    placements?: unknown;
}): HomeWidgetPlacements {
    if (raw.placements && typeof raw.placements === 'object') {
        const base = buildDefaultPlacements();
        const obj = raw.placements as Record<string, HomeWidgetPlacement>;
        for (const id of HOME_WIDGET_IDS) {
            const p = obj[id];
            if (p && (p.zone === 'main' || p.zone === 'dock') && typeof p.order === 'number') {
                base[id] = { zone: p.zone, order: p.order };
            }
        }
        return consolidateLegacyRepositoryDock(reindexZone(reindexZone(base, 'main'), 'dock'));
    }

    const base = buildDefaultPlacements();
    const mainOrder: string[] = [];
    const scroll = Array.isArray(raw.scrollOrder) ? raw.scrollOrder : [];
    for (const id of scroll) {
        if (id === 'hub') {
            const hubTiles = Array.isArray(raw.hubTileOrder)
                ? raw.hubTileOrder
                : ['hubExecution', 'hubLawsuit', 'hubTransaction'];
            for (const t of hubTiles) if (typeof t === 'string') mainOrder.push(t);
        } else if (typeof id === 'string' && id !== 'notepad' && id !== 'homeTitle') {
            mainOrder.push(id);
        }
    }
    if (mainOrder.length === 0) {
        mainOrder.push('alerts', 'hubExecution', 'hubLawsuit', 'hubTransaction', 'forum');
    }
    mainOrder.filter((id) => id !== 'homeTitle').forEach((id, i) => {
        if (isHomeWidgetId(id)) base[id] = { zone: 'main', order: i };
    });

    const dockOrder = Array.isArray(raw.dockItemOrder)
        ? raw.dockItemOrder
        : ['dockRepository', 'dockCalendar', 'dockTasks', 'dockQuickNote'];
    dockOrder.forEach((id, i) => {
        if (isHomeWidgetId(id as string)) base[id as HomeWidgetId] = { zone: 'dock', order: i };
    });

    return consolidateLegacyRepositoryDock(reindexZone(reindexZone(base, 'main'), 'dock'));
}

function stashRepositoryLegacyWidgets(placements: HomeWidgetPlacements): {
    placements: HomeWidgetPlacements;
    changed: boolean;
} {
    const next = { ...placements };
    let changed = false;
    for (const id of REPOSITORY_LEGACY_WIDGET_IDS) {
        const zone = next[id]?.zone;
        if (zone !== 'main' && zone !== 'dock') continue;
        next[id] = { zone: 'dock', order: 98 + REPOSITORY_LEGACY_WIDGET_IDS.indexOf(id) };
        changed = true;
    }
    return { placements: next, changed };
}

/** دمج أيقونتي المفكرة والمخزن القديمتين في المستودع الذكي */
export function consolidateLegacyRepositoryDock(
    placements: HomeWidgetPlacements,
): HomeWidgetPlacements {
    const dockIds = getWidgetsInZone(placements, 'dock');
    const mainIds = getWidgetsInZone(placements, 'main');
    const hasLegacyOnSurface =
        dockIds.some(isRepositoryLegacyWidget) || mainIds.some(isRepositoryLegacyWidget);

    if (dockIds.includes('dockRepository')) {
        if (!hasLegacyOnSurface) return placements;
        const stashed = stashRepositoryLegacyWidgets(placements);
        return stashed.changed
            ? reindexZone(reindexZone(stashed.placements, 'main'), 'dock')
            : placements;
    }

    const hasLegacy = dockIds.includes('dockNotepad') || dockIds.includes('dockVault');
    if (!hasLegacy) return placements;

    const next = { ...placements };
    const legacyOrder = Math.min(
        dockIds.includes('dockNotepad') ? placements.dockNotepad?.order ?? 0 : 99,
        dockIds.includes('dockVault') ? placements.dockVault?.order ?? 0 : 99,
    );
    next.dockRepository = { zone: 'dock', order: legacyOrder };
    const stashed = stashRepositoryLegacyWidgets(next);
    return reindexZone(reindexZone(stashed.placements, 'main'), 'dock');
}

export const DOCK_ONLY_WIDGETS: DockItemId[] = [
    'dockRepository',
    'dockNotepad',
    'dockCalendar',
    'dockVault',
    'dockTasks',
    'dockQuickNote',
];

export function defaultMainSpan(widgetId: HomeWidgetId): 1 | 2 {
    if (widgetId === 'alerts' || widgetId === 'forum') return 2;
    if (widgetId === 'hubExecution') return 2;
    return 1;
}

export type { BackgroundPresetId };

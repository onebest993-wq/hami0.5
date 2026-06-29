import type { HomeWidgetId, HomeWidgetPlacements } from './homeWidgetPlacements';
import {
    buildDefaultPlacements,
    getWidgetsInZone,
    isDockShellOrderWidget,
    transferWidget,
} from './homeWidgetPlacements';

/** أيقونات الشريط السفلي فقط — لا يشمل شريط الملاحظة السريعة */
export function getDockShellWidgetIds(placements: HomeWidgetPlacements): HomeWidgetId[] {
    return getWidgetsInZone(placements, 'dock').filter(isDockShellOrderWidget);
}

/** نقل أيقونات الدوك إلى الرئيسية مع حفظ ترتيب الاستعادة — يُبقي dockQuickNote في مكانه */
export function evacuateDockShellIconsToMain(placements: HomeWidgetPlacements): {
    placements: HomeWidgetPlacements;
    dockHiddenWidgetIds: HomeWidgetId[];
} {
    const dockIds = getDockShellWidgetIds(placements);
    if (dockIds.length === 0) {
        return { placements, dockHiddenWidgetIds: [] };
    }

    let next = placements;
    const mainStart = getWidgetsInZone(next, 'main').length;
    dockIds.forEach((id, offset) => {
        next = transferWidget(next, id, 'main', mainStart + offset);
    });

    return { placements: next, dockHiddenWidgetIds: dockIds };
}

/** @deprecated استخدم evacuateDockShellIconsToMain */
export function evacuateDockToMain(placements: HomeWidgetPlacements): {
    placements: HomeWidgetPlacements;
    dockHiddenWidgetIds: HomeWidgetId[];
} {
    return evacuateDockShellIconsToMain(placements);
}

/** إعادة أيقونات الدوك من النسخة المحفوظة أو الافتراضي — دون المساس بشريط الملاحظة */
export function repopulateDockShellFromHidden(
    placements: HomeWidgetPlacements,
    dockHiddenWidgetIds: HomeWidgetId[],
): HomeWidgetPlacements {
    const savedShellIds = dockHiddenWidgetIds.filter(isDockShellOrderWidget);
    const restoreIds =
        savedShellIds.length > 0
            ? savedShellIds
            : getDockShellWidgetIds(buildDefaultPlacements());

    let next = placements;
    restoreIds.forEach((id, index) => {
        if (getWidgetsInZone(next, 'dock').includes(id)) return;
        next = transferWidget(next, id, 'dock', index);
    });

    return next;
}

/** @deprecated استخدم repopulateDockShellFromHidden */
export function repopulateDockFromHidden(
    placements: HomeWidgetPlacements,
    dockHiddenWidgetIds: HomeWidgetId[],
): HomeWidgetPlacements {
    return repopulateDockShellFromHidden(placements, dockHiddenWidgetIds);
}

/** يضمن وجود شريط الملاحظة في الدوك عند التفعيل — يحترم نقله إلى الرئيسية (فصل عن الحاوية) */
export function ensureQuickNoteDockPlacement(placements: HomeWidgetPlacements): HomeWidgetPlacements {
    const quickNoteZone = placements.dockQuickNote?.zone;
    if (quickNoteZone === 'main') return placements;
    const dockIds = getWidgetsInZone(placements, 'dock');
    if (dockIds.includes('dockQuickNote')) return placements;
    return transferWidget(placements, 'dockQuickNote', 'dock', dockIds.length);
}

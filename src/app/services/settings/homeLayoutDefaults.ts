import { buildDefaultPlacements, type HomeWidgetId } from './homeWidgetPlacements';

/** Defaults فقط — بلا surfaceAppearance/normalize graph (boot-safe عبر defaults.ts) */
export const HOME_LAYOUT_DEFAULTS = {
    placements: buildDefaultPlacements(),
    dockVisible: false,
    quickNoteVisible: false,
    dockHiddenWidgetIds: [] as HomeWidgetId[],
    overrides: {},
};

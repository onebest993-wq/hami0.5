import type { HomeWidgetId } from '@/app/services/settings/homeLayout';

export const SECONDARY_HOME_WIDGET_IDS = new Set<HomeWidgetId>([
    'dockRepository',
    'dockNotepad',
    'dockCalendar',
    'dockVault',
    'dockTasks',
]);

export const COMMAND_HUB_TILE_SLOT_IDS = new Set<HomeWidgetId>([
    'hubExecution',
    'hubLawsuit',
    'hubTransaction',
    'forum',
    'alerts',
    ...SECONDARY_HOME_WIDGET_IDS,
]);

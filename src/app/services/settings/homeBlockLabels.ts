import type { DockItemId, HomeCustomizableId, HomeHubTileId, HomeScrollBlockId } from './homeLayout';
import type { HomeWidgetId } from './homeWidgetPlacements';

const HOME_SCROLL_BLOCK_LABELS: Record<HomeScrollBlockId, string> = {
    alerts: 'البطاقة',
    hub: 'مركز القيادة',
    forum: 'المنتدى القانوني',
};

export const HOME_HUB_TILE_LABELS: Record<HomeHubTileId, string> = {
    hubExecution: 'تنفيذ',
    hubLawsuit: 'دعاوى',
    hubTransaction: 'معاملات',
};

const DOCK_ITEM_LABELS: Record<DockItemId, string> = {
    dockRepository: 'المستودع',
    dockCalendar: 'التقويم',
    dockTasks: 'مهام',
    dockQuickNote: 'ملاحظة',
};

/** تسميات مختصرة موحّدة داخل الشريط السفلي */
const DOCK_SHELL_SHORT_LABELS: Partial<Record<HomeWidgetId, string>> = {
    alerts: 'البطاقة',
    forum: 'المنتدى',
    hubExecution: 'تنفيذ',
    hubLawsuit: 'دعاوى',
    hubTransaction: 'معاملات',
    ...DOCK_ITEM_LABELS,
};

export const HOME_WIDGET_LABELS: Record<HomeWidgetId, string> = {
    alerts: 'البطاقة',
    hubExecution: 'تنفيذ',
    hubLawsuit: 'دعاوى',
    hubTransaction: 'معاملات',
    forum: 'المنتدى القانوني',
    dockRepository: 'المستودع',
    dockNotepad: 'المستودع',
    dockCalendar: 'التقويم',
    dockVault: 'المستودع',
    dockTasks: 'مهام',
    dockQuickNote: 'ملاحظة',
};

export function dockShellLabel(widgetId: HomeWidgetId): string {
    return DOCK_SHELL_SHORT_LABELS[widgetId] ?? HOME_WIDGET_LABELS[widgetId] ?? widgetId;
}

export const HOME_BLOCK_LABELS: Record<HomeCustomizableId, string> = {
    ...HOME_SCROLL_BLOCK_LABELS,
    ...HOME_HUB_TILE_LABELS,
    ...DOCK_ITEM_LABELS,
    ...HOME_WIDGET_LABELS,
    dockShell: 'حاوية الشريط السفلي',
};

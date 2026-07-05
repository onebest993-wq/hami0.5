import type { DockItemId, HomeCustomizableId, HomeHubTileId, HomeScrollBlockId } from './homeLayout';
import type { HomeWidgetId } from './homeWidgetPlacements';

export const HOME_SCROLL_BLOCK_LABELS: Record<HomeScrollBlockId, string> = {
    alerts: 'التنبيهات والتثبيت',
    hub: 'مركز القيادة',
    forum: 'المنتدى القانوني',
};

export const HOME_HUB_TILE_LABELS: Record<HomeHubTileId, string> = {
    hubExecution: 'تنفيذ',
    hubLawsuit: 'دعاوى',
    hubTransaction: 'معاملات',
};

export const DOCK_ITEM_LABELS: Record<DockItemId, string> = {
    dockRepository: 'المستودع الذكي',
    dockCalendar: 'التقويم',
    dockTasks: 'مهام',
    dockQuickNote: 'ملاحظة',
};

/** تسميات مختصرة موحّدة داخل الشريط السفلي */
export const DOCK_SHELL_SHORT_LABELS: Partial<Record<HomeWidgetId, string>> = {
    alerts: 'تنبيهات',
    forum: 'المنتدى',
    hubExecution: 'تنفيذ',
    hubLawsuit: 'دعاوى',
    hubTransaction: 'معاملات',
    ...DOCK_ITEM_LABELS,
};

export const HOME_WIDGET_LABELS: Record<HomeWidgetId, string> = {
    alerts: 'التنبيهات والتثبيت',
    hubExecution: 'تنفيذ',
    hubLawsuit: 'دعاوى',
    hubTransaction: 'معاملات',
    forum: 'المنتدى القانوني',
    dockRepository: 'المستودع الذكي',
    dockNotepad: 'المستودع الذكي',
    dockCalendar: 'التقويم',
    dockVault: 'المستودع الذكي',
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

export const HOME_BLOCK_SIZE_LABELS = {
    compact: 'مضغوط',
    normal: 'عادي',
    large: 'كبير',
} as const;

export const HOME_BLOCK_SHAPE_LABELS = {
    pill: 'كبسولة',
    rounded: 'مستدير',
    sharp: 'حاد',
    circle: 'دائري',
} as const;

export const HOME_BLOCK_PATTERN_LABELS = {
    glass: 'زجاجي',
    solid: 'صلب',
    gradient: 'تدرج',
    rim: 'إطار ذهبي',
    minimal: 'بسيط',
} as const;

import { shouldShowAlertsDockBadge } from '@/app/services/alerts/dockAlertsOpen';
import {
    resolveForumShellAriaLabel,
    shouldShowForumUnreadBadge,
} from '@/app/services/forum/forumShellNavigation';
import type { HomeWidgetId } from './homeWidgetPlacements';

export type DockShellBadgeContext = {
    pendingFieldTasksCount?: number;
    pinnedCount?: number;
    urgentAlertsCount?: number;
    forumUnreadCount?: number;
    repositorySparkAttentionCount?: number;
    calendarSparkAttentionCount?: number;
};

/** تسمية قارئ الشاشة لأيقونة الشريط السفلي — تتضمن الشارات عند وجودها */
export function resolveDockShellItemAriaLabel(
    widgetId: HomeWidgetId,
    label: string,
    ctx: DockShellBadgeContext = {},
): string {
    const pending = ctx.pendingFieldTasksCount ?? 0;
    const pinned = ctx.pinnedCount ?? 0;
    const urgent = ctx.urgentAlertsCount ?? 0;
    const forumUnread = ctx.forumUnreadCount ?? 0;

    if (widgetId === 'dockTasks' && pending > 0) {
        return `${label}، ${pending} مهام معلقة`;
    }

    if (widgetId === 'alerts' && shouldShowAlertsDockBadge(pinned, urgent)) {
        if (urgent > 0 && pinned > 0) {
            return `${label}، ${urgent} عاجل و${pinned} مثبّت`;
        }
        if (urgent > 0) {
            return `${label}، ${urgent} تنبيه عاجل`;
        }
        return `${label}، ${pinned} عنصر مثبّت`;
    }

    if (widgetId === 'dockCalendar' && urgent > 0) {
        return `${label}، ${urgent} تنبيه عاجل`;
    }

    const calendarSpark = ctx.calendarSparkAttentionCount ?? 0;
    if (widgetId === 'dockCalendar' && calendarSpark > 0) {
        const countLabel =
            calendarSpark === 1 ? 'متابعة إجرائية واحدة' : `${calendarSpark} متابعات إجرائية`;
        return `${label} — ${countLabel}`;
    }

    if (widgetId === 'forum' && shouldShowForumUnreadBadge(forumUnread)) {
        return resolveForumShellAriaLabel(forumUnread);
    }

    const repositorySpark = ctx.repositorySparkAttentionCount ?? 0;
    if (widgetId === 'dockRepository' && repositorySpark > 0) {
        return `${label}، متابعة إجرائية في المستودع`;
    }

    return label;
}

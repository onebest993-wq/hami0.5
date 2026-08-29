import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import type { TimeBucket } from '@/app/components/lawyer/NotificationPanel/types';

export function getTimeBucket(iso: string, now: Date): TimeBucket {
    const created = new Date(iso);
    if (!Number.isFinite(created.getTime())) return 'older';
    const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const today = dayStart(now);
    const cDay = dayStart(created);
    if (cDay === today) return 'today';
    if (cDay === today - 24 * 60 * 60 * 1000) return 'yesterday';
    return 'older';
}

export const EMPTY_NOTIFICATION_TIME_GROUPS: Record<TimeBucket, NotificationModel[]> = {
    today: [],
    yesterday: [],
    older: [],
};

export function groupNotificationsByTime(
    items: NotificationModel[],
    now: Date = new Date(),
): Record<TimeBucket, NotificationModel[]> {
    const groups: Record<TimeBucket, NotificationModel[]> = {
        today: [],
        yesterday: [],
        older: [],
    };
    for (const n of items) {
        groups[getTimeBucket(n.createdAt, now)].push(n);
    }
    return groups;
}

export function formatTimeShort(iso: string): string {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return '';
    const now = new Date();
    const sameDay =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();
    if (sameDay) {
        return d.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('ar-IQ', { day: '2-digit', month: '2-digit' });
}

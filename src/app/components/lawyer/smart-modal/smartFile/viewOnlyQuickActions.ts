import type { TimelineEvent } from '../../LawyerShared';

export type ViewOnlyQuickActionId = 'appointment' | 'note' | 'document';

function isVisibleTimelineEvent(event: TimelineEvent | undefined): boolean {
    if (!event) return false;
    return !(event as { isDeleted?: boolean }).isDeleted;
}

/** أزرار الإجراءات السريعة الظاهرة في وضع الاطلاع — فقط إن وُجد محتوى */
export function resolveViewOnlyQuickActionIds(
    timeline: TimelineEvent[] | undefined,
): ViewOnlyQuickActionId[] {
    const events = timeline ?? [];
    const ids: ViewOnlyQuickActionId[] = [];
    if (events.some((e) => e.type === 'appointment' && isVisibleTimelineEvent(e))) {
        ids.push('appointment');
    }
    if (events.some((e) => e.type === 'note' && isVisibleTimelineEvent(e))) {
        ids.push('note');
    }
    if (events.some((e) => e.type === 'document' && isVisibleTimelineEvent(e))) {
        ids.push('document');
    }
    return ids;
}

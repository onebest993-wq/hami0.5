import type { TimelineEvent } from '../../LawyerShared';

export function mapTimelineSoftDelete(
    timeline: TimelineEvent[],
    eventId: string,
    isDeleted: boolean,
): TimelineEvent[] {
    return timeline.map((e) => (e.id === eventId ? { ...e, isDeleted } : e));
}

export function filterTimelineRemoveId(timeline: TimelineEvent[], eventId: string): TimelineEvent[] {
    return timeline.filter((e) => e.id !== eventId);
}

export function filterTimelineEmptyTrash(timeline: TimelineEvent[]): TimelineEvent[] {
    return timeline.filter((e) => !e.isDeleted);
}

import type { TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';
import {
    mapCalendarModuleToScheduleSource,
    resolveScheduleItemDurationMinutes,
    type ScheduleItemSource,
} from '@/app/services/calendar/scheduleItemSource';

function parseTimeToMinutes(time: string | undefined): number | null {
    const raw = String(time ?? '').trim();
    if (!raw) return null;
    const m = raw.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    return h * 60 + min;
}

/** يستنتج مدة الجلسة من وقت البداية والنهاية */
export function durationMinutesFromTimeRange(
    startTime: string | undefined,
    endTime: string | undefined,
): number | null {
    const start = parseTimeToMinutes(startTime);
    const end = parseTimeToMinutes(endTime);
    if (start === null || end === null) return null;
    const gap = end - start;
    if (gap <= 0 || gap > 8 * 60) return null;
    return gap;
}

function readMetadataDurationMinutes(metadata: Record<string, unknown> | undefined): number | null {
    const raw = Number(metadata?.durationMinutes ?? metadata?.hearingDurationMinutes);
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return Math.round(raw);
}

/** مدة صريحة فقط — لا افتراض 60د عند غياب بيانات الإضبارة */
export function resolveExplicitCalendarEventDurationMinutes(
    event: {
        time?: string;
        endTime?: string;
        durationMinutes?: number;
    },
): number | null {
    const explicit = Number(event.durationMinutes);
    if (Number.isFinite(explicit) && explicit > 0) return Math.round(explicit);
    const fromRange = durationMinutesFromTimeRange(event.time, event.endTime);
    if (fromRange) return fromRange;
    return null;
}

export function resolveTimelineEventDurationMinutes(event: TimelineEvent): number | null {
    const direct = Number((event as { durationMinutes?: unknown }).durationMinutes);
    if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
    const fromMeta = readMetadataDurationMinutes(event.metadata);
    if (fromMeta) return fromMeta;
    const endTime =
        typeof event.metadata?.endTime === 'string'
            ? event.metadata.endTime
            : typeof event.metadata?.sessionEndTime === 'string'
              ? event.metadata.sessionEndTime
              : undefined;
    return durationMinutesFromTimeRange(event.time, endTime);
}

export function resolveUnifiedEventDurationMinutes(
    event: Pick<UnifiedEvent, 'time' | 'endTime' | 'durationMinutes' | 'type' | 'source' | 'bridge'>,
): number {
    const source = mapCalendarModuleToScheduleSource(
        event.bridge?.sourceModule,
        event.source,
        event.type,
    );
    const explicit = Number(event.durationMinutes);
    if (Number.isFinite(explicit) && explicit > 0) {
        return resolveScheduleItemDurationMinutes(source, explicit);
    }
    const fromRange = durationMinutesFromTimeRange(event.time, event.endTime);
    if (fromRange) return fromRange;
    return resolveScheduleItemDurationMinutes(source);
}

export function resolveCalendarLikeEventDurationMinutes(
    event: {
        time?: string;
        endTime?: string;
        durationMinutes?: number;
        type?: string;
        source?: string;
        bridge?: { sourceModule?: string } | null;
    },
    scheduleSource?: ScheduleItemSource,
): number {
    const source =
        scheduleSource ??
        mapCalendarModuleToScheduleSource(event.bridge?.sourceModule, event.source, event.type);
    const explicit = Number(event.durationMinutes);
    if (Number.isFinite(explicit) && explicit > 0) {
        return resolveScheduleItemDurationMinutes(source, explicit);
    }
    const fromRange = durationMinutesFromTimeRange(event.time, event.endTime);
    if (fromRange) return fromRange;
    return resolveScheduleItemDurationMinutes(source);
}

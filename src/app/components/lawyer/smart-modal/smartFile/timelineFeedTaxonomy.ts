import type { TimelineEvent } from '../../LawyerShared';
import {
    cleanTimelineCardTitle,
    timelineDescriptionForDisplay,
} from '@/app/utils/timelineSmartDisplay';
import { isOpponentProceedingsEvent, isSessionTimelineEvent } from './sessionRecordEngine';

export type TimelineFeedCategory =
    | 'all'
    | 'appointment'
    | 'note'
    | 'document'
    | 'procedural'
    | 'session'
    | 'request'
    | 'attachment'
    | 'pleading';

export type TimelineFeedCategoryMeta = {
    id: TimelineFeedCategory;
    label: string;
    chipActive: string;
    chipIdle: string;
};

export const TIMELINE_FEED_CATEGORIES: TimelineFeedCategoryMeta[] = [
    {
        id: 'all',
        label: 'الكل',
        chipActive: 'border-[#E6C673]/45 bg-[#E6C673]/15 text-[#E6C673]',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-[#E6C673]/25 hover:text-[#E6C673]/80',
    },
    {
        id: 'appointment',
        label: 'موعد',
        chipActive: 'border-indigo-400/45 bg-indigo-500/15 text-indigo-200',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-indigo-400/30 hover:text-indigo-200/90',
    },
    {
        id: 'note',
        label: 'ملاحظة',
        chipActive: 'border-amber-400/45 bg-amber-500/15 text-amber-200',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-amber-400/30 hover:text-amber-200/90',
    },
    {
        id: 'document',
        label: 'مستند',
        chipActive: 'border-purple-400/45 bg-purple-500/15 text-purple-200',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-purple-400/30 hover:text-purple-200/90',
    },
    {
        id: 'procedural',
        label: 'إجراءات',
        chipActive: 'border-orange-400/45 bg-orange-500/15 text-orange-200',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-orange-400/30 hover:text-orange-200/90',
    },
    {
        id: 'session',
        label: 'محضر',
        chipActive: 'border-sky-400/45 bg-sky-500/15 text-sky-200',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-sky-400/30 hover:text-sky-200/90',
    },
    {
        id: 'request',
        label: 'طلب',
        chipActive: 'border-[#E6C673]/45 bg-[#E6C673]/15 text-[#E6C673]',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-[#E6C673]/30 hover:text-[#E6C673]/85',
    },
    {
        id: 'attachment',
        label: 'حجز',
        chipActive: 'border-rose-400/45 bg-rose-500/15 text-rose-200',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-rose-400/30 hover:text-rose-200/90',
    },
    {
        id: 'pleading',
        label: 'ختام مرافعة',
        chipActive: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-200',
        chipIdle: 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-emerald-400/30 hover:text-emerald-200/90',
    },
];

type Ext = TimelineEvent & {
    isFastTrack?: boolean;
    isAttachment?: boolean;
    isPause?: boolean;
    isInterruption?: boolean;
};

const STATUS_TAIL_RE =
    /\s*[-–—]\s*(⏳\s*)?(قيد الانتظار|صدر قرار بالقبول|صدر قرار بالرفض|موافقة المحكمة|قيد نظر التظلم).*/i;

const STATUS_LINE_RE = /^الحالة:\s*.+$/im;

export function classifyTimelineEvent(event: TimelineEvent): Exclude<TimelineFeedCategory, 'all'> {
    const ext = event as Ext;
    const title = String(event.title ?? '');

    if (/ختام\s*المرافعة|حجز\s*الدعوى\s*للقرار/i.test(title)) return 'pleading';
    if (ext.isAttachment || /حجز\s*احتياطي/i.test(title)) return 'attachment';
    if (ext.isFastTrack || event.isFastTrack) return 'request';
    if (isSessionTimelineEvent(event) && !isOpponentProceedingsEvent(event)) return 'session';

    if (event.type === 'appointment') return 'appointment';
    if (event.type === 'note') return 'note';
    if (event.type === 'document') return 'document';

    if (
        event.type === 'action'
        || event.type === 'alert'
        || ext.isPause
        || ext.isInterruption
        || /استئخار|انقطاع|عوارض|ترك\s*الدعوى|وقف\s*اتفاقي|رد\s*القاضي/i.test(title)
    ) {
        return 'procedural';
    }

    if (event.type === 'decision' || event.type === 'milestone') return 'procedural';
    if (event.type === 'expert') return 'procedural';

    return 'procedural';
}

export function getTimelineCategoryMeta(category: TimelineFeedCategory): TimelineFeedCategoryMeta {
    return TIMELINE_FEED_CATEGORIES.find((c) => c.id === category) ?? TIMELINE_FEED_CATEGORIES[0];
}

export function formatTimelineCardTitle(event: TimelineEvent): string {
    const ext = event as Ext;
    let title = cleanTimelineCardTitle(event);

    if (ext.isFastTrack || event.isFastTrack) {
        title = title.replace(/^طلب\s*[:：]?\s*/i, '').replace(STATUS_TAIL_RE, '').trim();
    }

    return title || '—';
}

export function formatTimelineCardBody(event: TimelineEvent): string {
    const ext = event as Ext;
    let body = timelineDescriptionForDisplay(event);

    if (ext.isFastTrack || event.isFastTrack) {
        body = body
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line && !STATUS_LINE_RE.test(line))
            .join('\n')
            .trim();
    }

    return body;
}

export function timelineEventSearchBlob(event: TimelineEvent): string {
    const category = classifyTimelineEvent(event);
    const meta = getTimelineCategoryMeta(category);
    const tags = Array.isArray(event.tags) ? event.tags.join(' ') : '';

    return [
        formatTimelineCardTitle(event),
        formatTimelineCardBody(event),
        event.title,
        event.details,
        event.date,
        event.time,
        event.type,
        event.docCategory,
        meta.label,
        tags,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
}

export function filterTimelineFeed(
    events: TimelineEvent[],
    options: { query?: string; category?: TimelineFeedCategory },
): TimelineEvent[] {
    const q = String(options.query ?? '').trim().toLowerCase();
    const category = options.category ?? 'all';

    return events.filter((event) => {
        if (category !== 'all' && classifyTimelineEvent(event) !== category) return false;
        if (!q) return true;
        return timelineEventSearchBlob(event).includes(q);
    });
}

export function countTimelineByCategory(events: TimelineEvent[]): Record<TimelineFeedCategory, number> {
    const counts: Record<TimelineFeedCategory, number> = {
        all: events.length,
        appointment: 0,
        note: 0,
        document: 0,
        procedural: 0,
        session: 0,
        request: 0,
        attachment: 0,
        pleading: 0,
    };

    for (const event of events) {
        const cat = classifyTimelineEvent(event);
        counts[cat] += 1;
    }

    return counts;
}

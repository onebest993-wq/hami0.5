/**
 * كاشف تعارضات/إثقال عبر أقسام الجدول ليوم محدد.
 * يوحّد الجلسات والمعاملات والمهام، ويستبعد المكتمل، ويستخدم المحكمة كاحتياطي موقع.
 */
import { resolveExplicitCalendarEventDurationMinutes } from '@/app/services/calendar/calendarDurationUtils';

export type ScheduleItemSource = 'HEARING' | 'TRANSACTION' | 'TASK';

export type UnifiedScheduleItem = {
    id: string;
    title: string;
    date: string;
    location?: string;
    time?: string;
    source: ScheduleItemSource;
    durationMinutes?: number;
};

export type CrossSectionConflictInput = {
    hearings?: Array<{
        id: string;
        title: string;
        date: string;
        location?: string;
        time?: string;
        isCompleted?: boolean;
    }>;
    transactions?: Array<{
        id: string;
        title: string;
        date: string;
        location?: string;
        time?: string;
        isCompleted?: boolean;
    }>;
    tasks?: Array<{
        id: string;
        title: string;
        date: string;
        location?: string;
        time?: string;
        isCompleted?: boolean;
    }>;
    /** يوم الهدف YYYY-MM-DD — إن وُجد يُصفّى إليه */
    targetDate?: string;
};

export type SourceCounts = Record<ScheduleItemSource, number>;

export type TravelConflictDetail = {
    prevTitle: string;
    currTitle: string;
    prevLocation: string;
    currLocation: string;
    gapMinutes: number;
};

export type CrossSectionConflictResult = {
    items: UnifiedScheduleItem[];
    totalCount: number;
    sourceCounts: SourceCounts;
    isOverloaded: boolean;
    hasLocationMismatch: boolean;
    hasTravelConflict: boolean;
    distinctLocations: string[];
    travelConflict: TravelConflictDetail | null;
    warningMessage: string | null;
    travelWarning: string | null;
    hasConflict: boolean;
};

const OVERLOAD_THRESHOLD = 3;
const TRAVEL_GAP_MINUTES = 60;
const DEFAULT_DURATION_MINUTES: Record<ScheduleItemSource, number> = {
    HEARING: 60,
    TRANSACTION: 45,
    TASK: 30,
};

export function resolveScheduleItemDurationMinutes(
    source: ScheduleItemSource,
    explicitMinutes?: number | null,
): number {
    const raw = Number(explicitMinutes);
    if (Number.isFinite(raw) && raw > 0) return Math.round(raw);
    return DEFAULT_DURATION_MINUTES[source];
}

const EMPTY_SOURCE_COUNTS = (): SourceCounts => ({
    HEARING: 0,
    TRANSACTION: 0,
    TASK: 0,
});

function normalizeYmd(date: string): string {
    return String(date ?? '').trim().slice(0, 10);
}

/** تطبيع موقع للمقارنة والعرض — فراغات مضغوطة */
export function normalizeLocation(location: string | undefined | null): string {
    return String(location ?? '')
        .trim()
        .replace(/\s+/g, ' ');
}

function timeToMinutes(time: string | undefined): number | null {
    const raw = String(time ?? '').trim();
    if (!raw) return null;
    const m = raw.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    return h * 60 + min;
}

function pushSource(
    out: UnifiedScheduleItem[],
    seenIds: Set<string>,
    rows:
        | Array<{
              id: string;
              title: string;
              date: string;
              location?: string;
              time?: string;
              isCompleted?: boolean;
              durationMinutes?: number;
          }>
        | undefined,
    source: ScheduleItemSource,
    targetDate: string | undefined,
): void {
    if (!rows?.length) return;
    for (const row of rows) {
        if (row.isCompleted) continue;
        const date = normalizeYmd(row.date);
        if (!date) continue;
        if (targetDate && date !== targetDate) continue;
        const id = String(row.id ?? '').trim();
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);
        const location = normalizeLocation(row.location) || undefined;
        const time = String(row.time ?? '').trim() || undefined;
        out.push({
            id,
            title: String(row.title ?? '').trim() || 'موعد',
            date,
            location,
            time,
            source,
            durationMinutes: row.durationMinutes,
        });
    }
}

function sourceLabelAr(source: ScheduleItemSource): string {
    switch (source) {
        case 'HEARING':
            return 'جلسات/مواعيد';
        case 'TRANSACTION':
            return 'معاملات';
        case 'TASK':
            return 'مهام';
    }
}

function formatSourceBreakdown(counts: SourceCounts): string {
    const parts: string[] = [];
    (['HEARING', 'TRANSACTION', 'TASK'] as ScheduleItemSource[]).forEach((key) => {
        if (counts[key] > 0) parts.push(`${counts[key]} ${sourceLabelAr(key)}`);
    });
    return parts.join('، ');
}

function findTravelConflict(items: UnifiedScheduleItem[]): TravelConflictDetail | null {
    const timed = items
        .map((item) => ({ item, minutes: timeToMinutes(item.time) }))
        .filter((row): row is { item: UnifiedScheduleItem; minutes: number } => row.minutes !== null)
        .sort((a, b) => a.minutes - b.minutes);

    for (let i = 1; i < timed.length; i++) {
        const prev = timed[i - 1];
        const curr = timed[i];
        const prevDuration =
            prev.item.durationMinutes != null
                ? resolveScheduleItemDurationMinutes(prev.item.source, prev.item.durationMinutes)
                : 0;
        const gap = curr.minutes - (prev.minutes + prevDuration);
        const prevLoc = normalizeLocation(prev.item.location);
        const currLoc = normalizeLocation(curr.item.location);
        if (
            gap >= 0 &&
            gap < TRAVEL_GAP_MINUTES &&
            prevLoc &&
            currLoc &&
            prevLoc !== currLoc
        ) {
            return {
                prevTitle: prev.item.title,
                currTitle: curr.item.title,
                prevLocation: prevLoc,
                currLocation: currLoc,
                gapMinutes: gap,
            };
        }
    }
    return null;
}

function buildArabicWarning(
    totalCount: number,
    sourceCounts: SourceCounts,
    isOverloaded: boolean,
    hasLocationMismatch: boolean,
    distinctLocations: string[],
): string | null {
    if (!isOverloaded && !hasLocationMismatch) return null;

    const parts: string[] = [];
    const breakdown = formatSourceBreakdown(sourceCounts);
    if (isOverloaded) {
        parts.push(
            `إثقال عمل: ${totalCount} بنود مجدولة في هذا اليوم (أكثر من ${OVERLOAD_THRESHOLD}${
                breakdown ? ` — ${breakdown}` : ''
            }).`,
        );
    }
    if (hasLocationMismatch) {
        parts.push(
            `تعارض مواقع: ${distinctLocations.length} مواقع مختلفة (${distinctLocations.join('، ')}).`,
        );
    }
    return parts.join(' ');
}

function buildTravelWarning(detail: TravelConflictDetail | null): string | null {
    if (!detail) return null;
    return `تعارض زمني/مكاني: "${detail.prevTitle}" ثم "${detail.currTitle}" (فارق ${detail.gapMinutes} د) — من «${detail.prevLocation}» إلى «${detail.currLocation}».`;
}

/**
 * يوحّد جلسات + معاملات + مهام ليوم واحد، ويكشف الإثقال وتعارض المواقع والتنقّل الضيق.
 */
export function detectCrossSectionConflicts(
    input: CrossSectionConflictInput,
): CrossSectionConflictResult {
    const targetDate = input.targetDate ? normalizeYmd(input.targetDate) : undefined;
    const items: UnifiedScheduleItem[] = [];
    const seenIds = new Set<string>();
    pushSource(items, seenIds, input.hearings, 'HEARING', targetDate);
    pushSource(items, seenIds, input.transactions, 'TRANSACTION', targetDate);
    pushSource(items, seenIds, input.tasks, 'TASK', targetDate);

    const sourceCounts = EMPTY_SOURCE_COUNTS();
    for (const item of items) sourceCounts[item.source] += 1;

    const totalCount = items.length;
    const isOverloaded = totalCount > OVERLOAD_THRESHOLD;

    const locationSet = new Set<string>();
    for (const item of items) {
        const loc = normalizeLocation(item.location);
        if (loc) locationSet.add(loc);
    }
    const distinctLocations = [...locationSet];
    const hasLocationMismatch = distinctLocations.length > 1;

    const travelConflict = findTravelConflict(items);
    const hasTravelConflict = travelConflict !== null;
    const travelWarning = buildTravelWarning(travelConflict);

    const warningMessage = buildArabicWarning(
        totalCount,
        sourceCounts,
        isOverloaded,
        hasLocationMismatch,
        distinctLocations,
    );

    return {
        items,
        totalCount,
        sourceCounts,
        isOverloaded,
        hasLocationMismatch,
        hasTravelConflict,
        distinctLocations,
        travelConflict,
        warningMessage,
        travelWarning,
        hasConflict: Boolean(warningMessage) || hasTravelConflict,
    };
}

/** خريطة مصدر الجسر → تصنيف الكاشف */
export function mapCalendarModuleToScheduleSource(
    sourceModule: string | null | undefined,
    fallbackSource?: string | null,
    eventType?: string | null,
): ScheduleItemSource {
    const mod = String(sourceModule ?? '').trim().toLowerCase();
    if (mod === 'transaction' || mod === 'threading') return 'TRANSACTION';
    if (mod === 'task' || mod === 'note') return 'TASK';
    if (mod === 'lawsuit' || mod === 'execution' || mod === 'criminal' || mod === 'urgent') {
        return 'HEARING';
    }
    const fb = String(fallbackSource ?? '').trim().toLowerCase();
    if (fb === 'hearing' || fb === 'deadline') return 'HEARING';
    const typ = String(eventType ?? '').trim().toLowerCase();
    if (typ === 'consultation' || typ === 'deadline') return 'TASK';
    if (typ === 'execution') return 'HEARING';
    return 'HEARING';
}

export type CalendarLikeEvent = {
    id: string;
    title: string;
    date: string;
    location?: string;
    court?: string;
    time?: string;
    endTime?: string;
    durationMinutes?: number;
    type?: string;
    source?: string;
    isCompleted?: boolean;
    bridge?: { sourceModule?: string } | null;
};

/**
 * يحلّل أحداث التقويم الموحّدة ليوم محدد (ما يظهر فعلاً في الرادار).
 */
export function detectConflictsFromUnifiedEvents(
    events: CalendarLikeEvent[],
    targetDate?: string,
): CrossSectionConflictResult {
    const hearings: CrossSectionConflictInput['hearings'] = [];
    const transactions: CrossSectionConflictInput['transactions'] = [];
    const tasks: CrossSectionConflictInput['tasks'] = [];

    for (const ev of events) {
        if (ev.isCompleted) continue;
        const source = mapCalendarModuleToScheduleSource(
            ev.bridge?.sourceModule,
            ev.source,
            ev.type,
        );
        const location =
            normalizeLocation(ev.location) || normalizeLocation(ev.court) || undefined;
        const explicitDuration = resolveExplicitCalendarEventDurationMinutes(ev);
        const row = {
            id: ev.id,
            title: ev.title,
            date: normalizeYmd(ev.date),
            location,
            time: ev.time,
            isCompleted: false,
            durationMinutes: explicitDuration ?? undefined,
        };
        if (source === 'TRANSACTION') transactions!.push(row);
        else if (source === 'TASK') tasks!.push(row);
        else hearings!.push(row);
    }

    return detectCrossSectionConflicts({
        hearings,
        transactions,
        tasks,
        targetDate,
    });
}

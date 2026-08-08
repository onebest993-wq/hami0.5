import type { CalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import type { SparkCoherenceContextBundle, SparkCoherenceFinding } from '@/app/spark/coherence/types';
import { ymdFromMs } from '@/app/spark/calendar/calendarSparkTimeUtils';
import { resolveUnifiedEventDurationMinutes } from '@/app/services/calendar/calendarDurationUtils';

function formatDayLabel(dateYmd: string): string {
    const [y, m, d] = dateYmd.split('-');
    return `${d}/${m}/${y}`;
}

function conflictDaysToFindings(ctx: CalendarSparkContext): SparkCoherenceFinding[] {
    const findings: SparkCoherenceFinding[] = [];
    for (const day of ctx.conflictDays) {
        if (day.conflict.hasTravelConflict) {
            findings.push({
                id: `calendar-coherence:travel:${day.dateYmd}`,
                category: 'schedule',
                severity: 'warning',
                observation: day.conflict.travelWarning ?? 'تعارض تنقّل في الجدول.',
                evidence: [day.dateYmd],
            });
        } else if (day.conflict.isOverloaded) {
            findings.push({
                id: `calendar-coherence:overload:${day.dateYmd}`,
                category: 'schedule',
                severity: 'info',
                observation:
                    day.conflict.warningMessage ??
                    `إثقال يوم ${formatDayLabel(day.dateYmd)} في التقويم.`,
                evidence: [day.dateYmd],
            });
        }
    }
    return findings;
}

export function mergeDomainFindingsForCalendar(
    ctx: CalendarSparkContext,
    baseFindings: SparkCoherenceFinding[],
): SparkCoherenceFinding[] {
    const seen = new Set(baseFindings.map((f) => f.id));
    const merged = [...baseFindings];
    for (const finding of conflictDaysToFindings(ctx)) {
        if (seen.has(finding.id)) continue;
        seen.add(finding.id);
        merged.push(finding);
    }
    return merged;
}

/** يحوّل سياق التقويم إلى حزمة تماسك عامة */
export function normalizeCoherenceFromCalendar(ctx: CalendarSparkContext): SparkCoherenceContextBundle {
    const today = ymdFromMs(ctx.nowMs);
    const dates: SparkCoherenceContextBundle['dates'] = [
        { id: 'meta:today', label: 'اليوم', ymd: today, role: 'other', source: 'system' },
    ];
    const events: SparkCoherenceContextBundle['events'] = [];
    const facts: SparkCoherenceContextBundle['facts'] = [];

    for (const event of ctx.allEvents) {
        if (event.isCompleted) continue;
        const dateYmd = String(event.date ?? '').slice(0, 10);
        if (!dateYmd) continue;
        const duration = resolveUnifiedEventDurationMinutes(event);
        const location = String(event.court ?? event.location ?? '').trim();
        events.push({
            id: event.id,
            date: dateYmd,
            title: event.title,
            notes: [event.time, location, `${duration}د`].filter(Boolean).join(' · '),
            source: event.bridge?.sourceModule ?? event.source ?? 'calendar',
        });
        dates.push({
            id: `cal:${event.id}`,
            label: event.title,
            ymd: dateYmd,
            role: event.type === 'deadline' ? 'deadline' : 'hearing',
            source: 'calendar',
        });
    }

    facts.push(
        { id: 'upcoming', key: 'upcoming_count', value: ctx.upcoming.length, source: 'calendar' },
        {
            id: 'conflict_days',
            key: 'conflict_days_count',
            value: ctx.conflictDays.length,
            source: 'calendar',
        },
    );

    return {
        surface: 'calendar',
        dossierKey: ctx.dossierKey,
        facts,
        events,
        claims: [],
        dates,
        texts: [],
        actions: [],
        registeredDates: dates.map((d) => d.ymd),
    };
}

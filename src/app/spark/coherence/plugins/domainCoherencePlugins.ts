import type {
    SparkCoherenceContextBundle,
    SparkCoherenceFinding,
} from '@/app/spark/coherence/types';
import { scanCalendarConflictDays } from '@/app/spark/engine/calendarConflictSparkBridge';

function formatDayLabel(dateYmd: string): string {
    const [y, m, d] = dateYmd.split('-');
    return `${d}/${m}/${y}`;
}

function runCalendarCoherencePlugin(bundle: SparkCoherenceContextBundle): SparkCoherenceFinding[] {
    if (bundle.surface !== 'calendar') return [];

    const events = bundle.events.map((event) => ({
        id: event.id,
        title: event.title,
        date: String(event.date ?? event.deadline ?? '').slice(0, 10),
        time: undefined,
        type: 'hearing' as const,
        source: 'calendar' as const,
        location: String(event.notes ?? '').trim() || undefined,
        isCompleted: false,
    }));

    const conflicts = scanCalendarConflictDays(events, { horizonDays: 7 });
    const findings: SparkCoherenceFinding[] = [];

    for (const day of conflicts) {
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

/** نقطة توسعة — قواعد نطاق إضافية حسب السطح */
export function runDomainPluginRules(bundle: SparkCoherenceContextBundle): SparkCoherenceFinding[] {
    return runCalendarCoherencePlugin(bundle);
}

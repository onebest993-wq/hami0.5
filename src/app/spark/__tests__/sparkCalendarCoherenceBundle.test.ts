import { describe, expect, it } from 'vitest';
import { buildCalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { runSparkCoherenceForCalendar } from '@/app/spark/coherence/runSparkCoherenceForCalendar';
import { pickActiveCalendarSparkNudge } from '@/app/spark/engine/sparkCalendarEngine';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

function event(partial: Partial<UnifiedEvent> & Pick<UnifiedEvent, 'id' | 'title' | 'date'>): UnifiedEvent {
    return {
        type: 'hearing',
        source: 'hearing',
        isCompleted: false,
        ...partial,
    };
}

describe('تماسك التقويم — bundle حقيقي', () => {
    it('يكتشف إثقالاً من سياق الرادار', () => {
        const nowMs = Date.parse('2026-08-10T08:00:00');
        const allEvents: UnifiedEvent[] = [
            event({ id: '1', title: 'أ', date: '2026-08-10', time: '09:00', location: 'أ' }),
            event({ id: '2', title: 'ب', date: '2026-08-10', time: '10:00', location: 'ب' }),
            event({ id: '3', title: 'ج', date: '2026-08-10', time: '11:00', location: 'ج' }),
            event({ id: '4', title: 'د', date: '2026-08-10', time: '12:00', location: 'د' }),
        ];
        const ctx = buildCalendarSparkContext(allEvents, { nowMs });
        const report = runSparkCoherenceForCalendar(ctx);
        expect(report.findings.some((f) => f.id.includes('overload'))).toBe(true);
    });

    it('يدمج تماسك التقويم في طابور سبارك', () => {
        const nowMs = Date.parse('2026-08-05T10:00:00');
        const allEvents: UnifiedEvent[] = [
            event({ id: '1', title: 'أ', date: '2026-08-06', time: '09:00' }),
            event({ id: '2', title: 'ب', date: '2026-08-06', time: '10:00' }),
            event({ id: '3', title: 'ج', date: '2026-08-06', time: '11:00' }),
            event({ id: '4', title: 'د', date: '2026-08-06', time: '12:00' }),
        ];
        const ctx = buildCalendarSparkContext(allEvents, { nowMs, horizonHours: 168 });
        const report = runSparkCoherenceForCalendar(ctx);
        expect(report.findings.length).toBeGreaterThan(0);
        const nudge = pickActiveCalendarSparkNudge(ctx);
        expect(nudge?.kind).toBe('calendar.schedule_overload');
    });
});

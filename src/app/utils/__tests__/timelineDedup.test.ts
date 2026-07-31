import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import { dedupeTimelineEventsForDisplay, insertTimelineEventWithThreadReplace } from '@/app/utils/timelineDedup';

describe('timelineDedup', () => {
    it('merges legacy and new judge detention events', () => {
        const events: TimelineEvent[] = [
            {
                id: 'old',
                date: '2026-06-05',
                timestamp: '2026-06-05T00:00:00.000Z',
                title: '⚖️ رفض قاضي البداءة حبس المدين',
                description: 'سبب الرفض: لابلا',
                type: 'coercive',
                source: 'محضر المتابعة',
            },
            {
                id: 'new',
                date: '2026-06-05',
                timestamp: '2026-06-05T00:00:01.000Z',
                title: '⚖️ رفض قاضي البداءة حبس المدين',
                description: 'سبب الرفض: لابلا',
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: {
                    timelineThreadKey: 'executor_decision:pc_judge_1',
                    decisionRowId: 'pc_judge_1',
                },
            },
        ];
        const out = dedupeTimelineEventsForDisplay(events);
        expect(out).toHaveLength(1);
        expect(out[0]?.type).toBe('decision');
    });

    it('returns empty array when events is undefined', () => {
        expect(dedupeTimelineEventsForDisplay(undefined as unknown as TimelineEvent[])).toEqual([]);
    });

    it('replaces custody ward appointment by timelineThreadKey instead of duplicating', () => {
        const prev: TimelineEvent[] = [
            {
                id: 'tl-old',
                type: 'appointment',
                title: '📅 موعد تسليم المحضون: أحمد',
                date: '2026-07-31T12:00:00',
                metadata: { timelineThreadKey: 'custody_ward_appt:ward-0' },
            } as TimelineEvent,
        ];
        const incoming: TimelineEvent = {
            id: 'tl-new',
            type: 'appointment',
            title: '📅 موعد تسليم المحضون: أحمد',
            date: '2026-08-05T12:00:00',
            metadata: { timelineThreadKey: 'custody_ward_appt:ward-0' },
        } as TimelineEvent;
        const next = insertTimelineEventWithThreadReplace(prev, incoming);
        expect(next).toHaveLength(1);
        expect(next[0]?.id).toBe('tl-old');
        expect(String(next[0]?.date)).toContain('2026-08-05');
    });
});

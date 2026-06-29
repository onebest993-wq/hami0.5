import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import { dedupeTimelineEventsForDisplay } from '@/app/utils/timelineDedup';

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
});

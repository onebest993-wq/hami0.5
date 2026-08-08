import { describe, expect, it } from 'vitest';
import { countCalendarSparkAttention } from '@/app/spark/engine/calendarHomeSparkScan';
import type { UnifiedEvent } from '@/app/components/lawyer/hooks/useCalendarData';

describe('calendarHomeSparkScan', () => {
    const nowMs = Date.parse('2026-08-05T10:00:00');

    it('يعدّ إشارات التقويم من التضارب والقواعد الإجرائية', () => {
        const events: UnifiedEvent[] = [
            {
                id: 'ev-1',
                title: 'جلسة',
                date: '2026-08-05',
                time: '10:00',
                type: 'hearing',
                source: 'hearing',
                location: 'محكمة أ',
            },
            {
                id: 'ev-2',
                title: 'جلسة ثانية',
                date: '2026-08-05',
                time: '10:30',
                type: 'hearing',
                source: 'hearing',
                location: 'محكمة ب',
            },
        ];

        expect(countCalendarSparkAttention(events, undefined, { nowMs })).toBeGreaterThanOrEqual(1);
    });
});

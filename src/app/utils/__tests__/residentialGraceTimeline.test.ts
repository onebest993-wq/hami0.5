import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import { dedupeTimelineEventsForDisplay } from '@/app/utils/timelineDedup';
import { mergeLegacyEvictionResidentialGracePairs } from '@/app/utils/timelineSmartDisplay';
import {
    mergeResidentialGraceTimelineForDisplay,
    stripResidentialGraceTimelineEvents,
} from '@/app/utils/residentialGraceTimeline';

describe('residentialGraceTimeline', () => {
    it('dedupes three identical grace deadline appointments into one display card', () => {
        const mk = (id: string, ts: string): TimelineEvent => ({
            id,
            type: 'appointment',
            date: '2026-06-18T12:00:00',
            timestamp: ts,
            title: '⏳ انتهاء المهلة',
            description: 'المهلة 14 يوماً (من 2026-06-05 إلى 2026-06-18)',
            source: 'المهلة',
        });
        const events = [mk('a', '2026-06-04T10:00:00Z'), mk('b', '2026-06-04T11:00:00Z'), mk('c', '2026-06-04T12:00:00Z')];
        const out = mergeResidentialGraceTimelineForDisplay(events);
        expect(out).toHaveLength(1);
        expect(out[0]?.title).toBe('مهلة التخلية السكنية');
        expect(out[0]?.description).toContain('2026-06-05');
        expect(out[0]?.description).toContain('2026-06-18');
    });

    it('merges registration + appointment into a single grace card', () => {
        const registration: TimelineEvent = {
            id: 'reg',
            type: 'eviction',
            date: '2026-06-04',
            timestamp: '2026-06-04T09:00:00Z',
            title: '🏠 مهلة',
            description: 'من 2026-06-05 إلى 2026-06-18 — 14 يوماً تقويمياً',
            source: 'الإجراءات الجبرية — تخلية',
            metadata: {
                evictionResidentialGraceModal: true,
                graceStartYmd: '2026-06-05',
                graceEndYmd: '2026-06-18',
                graceDays: 14,
            },
        };
        const appointment: TimelineEvent = {
            id: 'appt',
            type: 'appointment',
            date: '2026-06-18T12:00:00',
            timestamp: '2026-06-04T09:00:01Z',
            title: '⏳ انتهاء المهلة',
            description: 'المهلة 14 يوماً (من 2026-06-05 إلى 2026-06-18)',
            source: 'المهلة',
        };
        const out = mergeLegacyEvictionResidentialGracePairs([registration, appointment]);
        expect(out).toHaveLength(1);
        expect(out[0]?.title).toBe('مهلة التخلية السكنية');
        expect(out[0]?.source).toBe('الإجراءات الجبرية — تخلية');
    });

    it('strips grace events before resave', () => {
        const events: TimelineEvent[] = [
            {
                id: 'old-appt',
                type: 'appointment',
                title: '⏳ انتهاء المهلة',
                date: '2026-06-01',
                description: 'x',
            },
            { id: 'keep', type: 'note', title: 'ملاحظة', date: '2026-06-01' },
        ];
        expect(stripResidentialGraceTimelineEvents(events)).toEqual([events[1]]);
    });

    it('dedupes grace appointments across different timestamps via similarity key', () => {
        const events: TimelineEvent[] = [
            {
                id: '1',
                type: 'appointment',
                date: '2026-06-18',
                timestamp: '2026-06-04T10:00:00Z',
                title: '⏳ انتهاء المهلة',
                description: 'المهلة 14 يوماً (من 2026-06-05 إلى 2026-06-18)',
                source: 'المهلة',
            },
            {
                id: '2',
                type: 'appointment',
                date: '2026-06-18',
                timestamp: '2026-06-04T12:00:00Z',
                title: '⏳ انتهاء المهلة',
                description: 'المهلة 14 يوماً (من 2026-06-05 إلى 2026-06-18)',
                source: 'تنفيذ — موعد',
            },
        ];
        const merged = mergeLegacyEvictionResidentialGracePairs(dedupeTimelineEventsForDisplay(events));
        expect(merged).toHaveLength(1);
    });
});

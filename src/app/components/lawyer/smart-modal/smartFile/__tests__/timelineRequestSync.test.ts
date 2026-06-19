import { describe, expect, it } from 'vitest';
import {
    buildFastTrackTimelineEvent,
    patchTimelineEvent,
    resolveFastTrackTimelineEventId,
} from '../timelineRequestSync';

describe('timelineRequestSync', () => {
    it('builds and patches fast track timeline events', () => {
        const event = buildFastTrackTimelineEvent(
            {
                requestType: 'منع سفر',
                subject: 'المدعى عليه',
                submissionDate: '2026-06-01',
                status: '⏳ قيد الانتظار (7 أيام)',
            },
            'timeline_fast_abc',
        );

        expect(event.title).toContain('منع سفر');
        expect(event.isFastTrack).toBe(true);
        expect(event.details).toContain('قيد الانتظار');

        const timeline = [event];
        const patched = patchTimelineEvent(
            timeline,
            'timeline_fast_abc',
            buildFastTrackTimelineEvent(
                {
                    requestType: 'منع سفر',
                    subject: 'تحديث',
                    submissionDate: '2026-06-02',
                    status: '✅ صدر قرار بالقبول',
                },
                'timeline_fast_abc',
            ),
        );

        expect(patched[0].details).toContain('بالقبول');
        expect(patched[0].details).toContain('تحديث');
    });

    it('resolves linked timeline id from petition record', () => {
        const id = resolveFastTrackTimelineEventId(
            'fast_99',
            { timelineEventId: 'timeline_fast_linked' },
            [],
        );
        expect(id).toBe('timeline_fast_linked');
    });
});

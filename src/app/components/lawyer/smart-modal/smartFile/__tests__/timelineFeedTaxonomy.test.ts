import { describe, expect, it } from 'vitest';
import {
    classifyTimelineEvent,
    filterTimelineFeed,
    formatTimelineCardBody,
    formatTimelineCardTitle,
} from '../timelineFeedTaxonomy';

describe('timelineFeedTaxonomy', () => {
    it('classifies events by source section', () => {
        expect(
            classifyTimelineEvent({
                id: '1',
                type: 'appointment',
                date: '2026-06-01',
                title: 'جلسة',
            }),
        ).toBe('appointment');

        expect(
            classifyTimelineEvent({
                id: '2',
                type: 'note',
                date: '2026-06-01',
                title: 'ملاحظة',
            }),
        ).toBe('note');

        expect(
            classifyTimelineEvent({
                id: '3',
                type: 'action',
                date: '2026-06-01',
                title: 'طلب',
                isFastTrack: true,
            }),
        ).toBe('request');

        expect(
            classifyTimelineEvent({
                id: '4',
                type: 'decision',
                date: '2026-06-01',
                title: 'محضر الجلسة 2',
                isSessionRecord: true,
            }),
        ).toBe('session');
    });

    it('filters by category and query together', () => {
        const events = [
            { id: '1', type: 'note', date: '2026-01-01', title: 'ملاحظة مهمة', details: 'نص' },
            { id: '2', type: 'appointment', date: '2026-01-02', title: 'جلسة مرافعة', details: 'موعد' },
        ];

        expect(filterTimelineFeed(events, { category: 'note' })).toHaveLength(1);
        expect(filterTimelineFeed(events, { category: 'appointment', query: 'مرافعة' })).toHaveLength(1);
        expect(filterTimelineFeed(events, { category: 'note', query: 'مرافعة' })).toHaveLength(0);
    });

    it('cleans fast track title and strips redundant status lines from body', () => {
        const event = {
            id: 'f1',
            type: 'action',
            date: '2026-06-18',
            title: 'لبليب - صدر قرار بالقبول',
            details: 'ليبليبليب\n\nالحالة: صدر قرار بالقبول',
            isFastTrack: true,
        };

        expect(formatTimelineCardTitle(event)).toBe('لبليب');
        expect(formatTimelineCardBody(event)).toBe('ليبليبليب');
    });
});

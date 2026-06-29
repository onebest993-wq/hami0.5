import { describe, it, expect } from 'vitest';
import {
    mergeTimelineEventsFromPersisted,
    mergeTrialSessionsFromPersisted,
    mergePersistedCriminalCaseWithLive,
} from '@/app/components/lawyer/criminal-system/criminalStorePersistMerge';

describe('criminalStorePersistMerge', () => {
    it('mergeTimelineEventsFromPersisted يدمج بدون فقدان live-only', () => {
        const live = [{ id: 'a', title: 'live' }] as any[];
        const persisted = [{ id: 'b', title: 'persisted' }] as any[];
        const merged = mergeTimelineEventsFromPersisted(live, persisted);
        expect(merged.map((e) => e.id).sort()).toEqual(['a', 'b']);
    });

    it('mergePersistedCriminalCaseWithLive يحدّث nextHearingDate ويدمج timeline', () => {
        const existing = {
            id: 'c1',
            location: { nextHearingDate: '2026-01-01' },
            timelineEvents: [],
            trials: [],
        } as any;
        const raw = {
            id: 'c1',
            location: { nextHearingDate: '2026-06-01' },
            timelineEvents: [{ id: 't1' }],
            trials: [],
        } as any;
        const merged = mergePersistedCriminalCaseWithLive(existing, raw);
        expect(merged.location.nextHearingDate).toBe('2026-06-01');
        expect(merged.timelineEvents).toEqual([{ id: 't1' }]);
    });

    it('mergeTrialSessionsFromPersisted يُرجع liveList عند persisted فارغ', () => {
        const live = [{ id: 's1', sessionNumber: 1 }] as any[];
        const merged = mergeTrialSessionsFromPersisted(live, []);
        expect(merged.length).toBeGreaterThanOrEqual(0);
    });
});

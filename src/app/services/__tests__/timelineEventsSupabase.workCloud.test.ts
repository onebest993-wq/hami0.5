import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();
const isLiveCloudSyncBucketEnabled = vi.fn(() => false);

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecure: (...args: unknown[]) => fetchSecure(...args),
    },
}));

vi.mock('@/app/services/settings/cloudSyncBucket', () => ({
    isLiveCloudSyncBucketEnabled: (...args: unknown[]) => isLiveCloudSyncBucketEnabled(...args),
}));

vi.mock('@/app/utils/debug', () => ({
    debug: { error: vi.fn(), warn: vi.fn(), log: vi.fn() },
}));

import {
    fetchTimelineEventsFromSupabase,
    insertTimelineEventToSupabase,
} from '@/app/services/timelineEventsSupabase';
import type { TimelineEvent } from '@/app/types/execution';

const event = { id: 'ev-1' } as TimelineEvent;

describe('timelineEventsSupabase work-cloud gate', () => {
    beforeEach(() => {
        fetchSecure.mockReset();
        isLiveCloudSyncBucketEnabled.mockReset();
        isLiveCloudSyncBucketEnabled.mockReturnValue(false);
    });

    it('لا يستدعي /api عند إغلاق سلة التنفيذ الحيّة', async () => {
        await insertTimelineEventToSupabase({ executionFileId: 'exec-1', event });
        const rows = await fetchTimelineEventsFromSupabase('exec-1');
        expect(rows).toEqual([]);
        expect(fetchSecure).not.toHaveBeenCalled();
    });

    it('يمرّر الطلب عند مزامنة التنفيذ الحيّة', async () => {
        isLiveCloudSyncBucketEnabled.mockReturnValue(true);
        fetchSecure.mockResolvedValue({ ok: true, rows: [] });
        await insertTimelineEventToSupabase({ executionFileId: 'exec-1', event });
        await fetchTimelineEventsFromSupabase('exec-1');
        expect(fetchSecure).toHaveBeenCalledTimes(2);
        expect(String(fetchSecure.mock.calls[0]?.[0])).toContain('/api/timeline-events');
        expect(String(fetchSecure.mock.calls[1]?.[0])).toContain('/api/timeline-events');
    });
});

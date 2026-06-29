import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    peekHomeHubRadarCache,
    resetHomeHubRadarCacheForTests,
    warmHomeHubRadarCache,
} from '@/app/services/alerts/homeHubRadarWarmCache';

vi.mock('@/app/services/calendar/calendarCloudLoader', () => ({
    fetchCalendarEvents: vi.fn().mockResolvedValue([{ id: 'ev-1', title: 'موعد' }]),
}));

describe('homeHubRadarWarmCache', () => {
    beforeEach(() => {
        resetHomeHubRadarCacheForTests();
        vi.clearAllMocks();
    });

    it('يُحمّي أحداث التقويم للمحامي', async () => {
        warmHomeHubRadarCache('lawyer-1');
        await vi.waitFor(() => expect(peekHomeHubRadarCache('lawyer-1')).not.toBeNull());
        expect(peekHomeHubRadarCache('lawyer-1')?.[0]?.id).toBe('ev-1');
    });
});

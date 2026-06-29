import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const addBreadcrumb = vi.fn();
const distribution = vi.fn();

vi.mock('@sentry/react', () => ({
    addBreadcrumb,
    metrics: { distribution },
}));

import {
    reportCalendarOpenToSentry,
    resetCalendarSentryModuleForTests,
} from '@/app/services/calendar/calendarSentryReporting';

describe('calendarSentryReporting', () => {
    beforeEach(() => {
        resetCalendarSentryModuleForTests();
        addBreadcrumb.mockClear();
        distribution.mockClear();
        vi.stubEnv('VITE_SENTRY_DSN', 'https://key@o0.ingest.sentry.io/1');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('يُرسل breadcrumb و distribution', async () => {
        reportCalendarOpenToSentry(320, { eventCount: 5, hadLocalCache: true });

        await vi.waitFor(() => expect(addBreadcrumb).toHaveBeenCalledTimes(1));

        expect(addBreadcrumb).toHaveBeenCalledWith(
            expect.objectContaining({
                category: 'calendar.perf',
                data: expect.objectContaining({
                    durationMs: 320,
                    hadLocalCache: true,
                    eventCount: 5,
                }),
            }),
        );
        expect(distribution).toHaveBeenCalledWith(
            'calendar.open_to_interactive_ms',
            320,
            expect.objectContaining({ unit: 'millisecond' }),
        );
    });

    it('يتخطى عند غياب DSN', async () => {
        vi.unstubAllEnvs();
        vi.stubEnv('VITE_SENTRY_DSN', '');
        resetCalendarSentryModuleForTests();

        reportCalendarOpenToSentry(100);
        await new Promise((r) => setTimeout(r, 20));

        expect(addBreadcrumb).not.toHaveBeenCalled();
    });
});

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const addBreadcrumb = vi.fn();
const distribution = vi.fn();

vi.mock('@sentry/react', () => ({
    addBreadcrumb,
    metrics: { distribution },
}));

import {
    reportHomeHubOpenToSentry,
    resetHomeHubSentryModuleForTests,
} from '@/app/services/alerts/homeHubSentryReporting';

describe('homeHubSentryReporting', () => {
    beforeEach(() => {
        resetHomeHubSentryModuleForTests();
        addBreadcrumb.mockClear();
        distribution.mockClear();
        vi.stubEnv('VITE_SENTRY_DSN', 'https://key@o0.ingest.sentry.io/1');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('يُرسل breadcrumb و distribution', async () => {
        reportHomeHubOpenToSentry(410, { alertsTabCount: 2, pinsCount: 1, hadRadarCache: true });

        await vi.waitFor(() => expect(addBreadcrumb).toHaveBeenCalledTimes(1));

        expect(addBreadcrumb).toHaveBeenCalledWith(
            expect.objectContaining({
                category: 'homeHub.perf',
                data: expect.objectContaining({
                    durationMs: 410,
                    alertsTabCount: 2,
                    pinsCount: 1,
                    hadRadarCache: true,
                }),
            }),
        );
        expect(distribution).toHaveBeenCalledWith(
            'homeHub.open_to_interactive_ms',
            410,
            expect.objectContaining({ unit: 'millisecond' }),
        );
    });

    it('يتخطى عند غياب DSN', async () => {
        vi.unstubAllEnvs();
        vi.stubEnv('VITE_SENTRY_DSN', '');
        resetHomeHubSentryModuleForTests();

        reportHomeHubOpenToSentry(100);
        await new Promise((r) => setTimeout(r, 20));

        expect(addBreadcrumb).not.toHaveBeenCalled();
    });
});

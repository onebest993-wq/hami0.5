import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const addBreadcrumb = vi.fn();
const distribution = vi.fn();

vi.mock('@sentry/react', () => ({
    addBreadcrumb,
    metrics: { distribution },
}));

import {
    reportProfileOpenToSentry,
    resetProfileSentryModuleForTests,
} from '@/app/services/profile/profileSentryReporting';

describe('profileSentryReporting', () => {
    beforeEach(() => {
        resetProfileSentryModuleForTests();
        addBreadcrumb.mockClear();
        distribution.mockClear();
        vi.stubEnv('VITE_SENTRY_DSN', 'https://key@o0.ingest.sentry.io/1');
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('يُرسل breadcrumb و distribution', async () => {
        reportProfileOpenToSentry(520, { hadWarmCache: true, isOwnProfile: true });

        await vi.waitFor(() => expect(addBreadcrumb).toHaveBeenCalledTimes(1));

        expect(distribution).toHaveBeenCalledWith(
            'profile.open_to_interactive_ms',
            520,
            expect.objectContaining({ unit: 'millisecond' }),
        );
    });
});

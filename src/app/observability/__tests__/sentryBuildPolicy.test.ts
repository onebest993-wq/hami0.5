import { describe, expect, it, vi } from 'vitest';
import { isSentryEnabledInBuild } from '@/app/observability/sentryBuildPolicy';

describe('isSentryEnabledInBuild', () => {
    it('returns false when VITE_ENABLE_SENTRY=false', () => {
        vi.stubEnv('VITE_ENABLE_SENTRY', 'false');
        vi.stubEnv('VITE_SENTRY_DSN', 'https://key@o0.ingest.sentry.io/1');
        expect(isSentryEnabledInBuild()).toBe(false);
    });

    it('returns false without a valid DSN', () => {
        vi.stubEnv('VITE_ENABLE_SENTRY', 'true');
        vi.stubEnv('VITE_SENTRY_DSN', '');
        expect(isSentryEnabledInBuild()).toBe(false);
    });

    it('returns true with valid DSN and enable flag', () => {
        vi.stubEnv('VITE_ENABLE_SENTRY', 'true');
        vi.stubEnv('VITE_SENTRY_DSN', 'https://key@o0.ingest.sentry.io/1');
        expect(isSentryEnabledInBuild()).toBe(true);
    });
});

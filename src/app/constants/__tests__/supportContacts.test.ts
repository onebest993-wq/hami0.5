import { afterEach, describe, expect, it, vi } from 'vitest';

describe('supportContacts', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.resetModules();
    });

    it('builds mailto from VITE_APP_SUPPORT_EMAIL', async () => {
        vi.stubEnv('VITE_APP_SUPPORT_EMAIL', 'custom.support@example.com');
        const { buildHamiSupportMailtoUrl, HAMI_SUPPORT_EMAIL } = await import(
            '@/app/constants/supportContacts'
        );
        expect(HAMI_SUPPORT_EMAIL).toBe('custom.support@example.com');
        expect(buildHamiSupportMailtoUrl()).toContain('mailto:custom.support@example.com');
    });

    it('لا يضمّن بريداً افتراضياً عند غياب المتغير', async () => {
        vi.stubEnv('VITE_APP_SUPPORT_EMAIL', '');
        const { buildHamiSupportMailtoUrl, HAMI_SUPPORT_EMAIL } = await import(
            '@/app/constants/supportContacts'
        );
        expect(HAMI_SUPPORT_EMAIL).toBe('');
        expect(buildHamiSupportMailtoUrl()).toMatch(/^mailto:\?subject=/);
    });
});

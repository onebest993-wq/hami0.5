import { describe, expect, it } from 'vitest';
import { sanitizeSentryEvent } from '../sentrySanitize';

describe('sanitizeSentryEvent', () => {
    it('redacts sensitive headers and JWT-like strings', () => {
        const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
        const event = sanitizeSentryEvent({
            request: {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                cookies: 'hami_access_token=secret',
            },
            extra: {
                email: 'lawyer@example.com',
                note: 'اتصل على 07701234567',
            },
        });

        expect(event?.request?.headers?.Authorization).toBe('[Filtered]');
        expect(event?.request?.cookies).toBe('[Filtered]');
        expect(event?.extra?.email).toBe('[Filtered]');
        expect(String(event?.extra?.note)).toContain('[Filtered]');
    });

    it('scrubs breadcrumb data without dropping the event', () => {
        const event = sanitizeSentryEvent({
            breadcrumbs: [
                {
                    message: 'contact user@firm.com',
                    data: { csrfToken: 'abc', area: 'settings' },
                },
            ],
        });

        expect(event?.breadcrumbs?.[0]?.message).toContain('[Filtered]');
        expect(event?.breadcrumbs?.[0]?.data?.csrfToken).toBe('[Filtered]');
        expect(event?.breadcrumbs?.[0]?.data?.area).toBe('settings');
    });
});

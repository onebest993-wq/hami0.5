import { describe, expect, it } from 'vitest';
import {
    scrubBrokenAuthHashFromAddress,
    shouldScrubAuthReturnUrl,
} from '@/app/services/auth/scrubBrokenAuthHash';

describe('scrubBrokenAuthHash', () => {
    it('scrubs expired magic-link error hashes from the address bar', () => {
        expect(
            shouldScrubAuthReturnUrl(
                '',
                '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
            ),
        ).toBe(true);

        window.history.pushState(
            {},
            '',
            '/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired',
        );
        expect(scrubBrokenAuthHashFromAddress()).toBe(true);
        expect(window.location.hash).toBe('');
        expect(window.location.search).toBe('');
    });

    it('scrubs a successful magiclink hash so HQ OTP cannot become a browser session', () => {
        expect(
            shouldScrubAuthReturnUrl('', '#access_token=x&type=magiclink&refresh_token=y'),
        ).toBe(true);
    });

    it('does not scrub password recovery or empty returns', () => {
        expect(
            shouldScrubAuthReturnUrl('', '#access_token=x&type=recovery&refresh_token=y'),
        ).toBe(false);
        expect(shouldScrubAuthReturnUrl('?hami_auth=recovery', '')).toBe(false);
        expect(shouldScrubAuthReturnUrl('', '')).toBe(false);

        window.history.pushState({}, '', '/?hami_auth=recovery#access_token=x&type=recovery');
        expect(scrubBrokenAuthHashFromAddress()).toBe(false);
        expect(window.location.search).toContain('hami_auth=recovery');
        expect(window.location.hash).toContain('type=recovery');
    });
});

import { describe, expect, it } from 'vitest';
import { HAMI_PLATFORM_ADMIN_UUID } from '@/app/constants/hamiPlatformAdminId';
import {
    headquartersDevAccessTokenFor,
    parseHeadquartersDevUnlockSubject,
    readBearerAuthorizationToken,
} from '../hqDevUnlock.ts';

describe('hqDevUnlock helpers', () => {
    it('يقبل توكن تطوير UUID فقط', () => {
        const token = headquartersDevAccessTokenFor(HAMI_PLATFORM_ADMIN_UUID);
        expect(parseHeadquartersDevUnlockSubject(token)).toBe(HAMI_PLATFORM_ADMIN_UUID);
        expect(parseHeadquartersDevUnlockSubject('dev-access-token-admin-uuid-1')).toBeNull();
        expect(parseHeadquartersDevUnlockSubject(`dev-access-token-${HAMI_PLATFORM_ADMIN_UUID}x`)).toBeNull();
        expect(parseHeadquartersDevUnlockSubject('eyJhbGciOiJub25lIn0.e30.x')).toBeNull();
    });

    it('يقرأ Bearer دون الكوكي', () => {
        const token = headquartersDevAccessTokenFor(HAMI_PLATFORM_ADMIN_UUID);
        const request = new Request('https://app.test/api/admin/otp/dev-unlock', {
            headers: {
                Authorization: `Bearer ${token}`,
                cookie: 'hami_access_token=other-session-token-bbbbbbbb',
            },
        });
        expect(readBearerAuthorizationToken(request)).toBe(token);
    });
});

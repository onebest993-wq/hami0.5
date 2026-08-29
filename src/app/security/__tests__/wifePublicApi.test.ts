import { describe, expect, it } from 'vitest';
import {
    isWifeBootstrapApiPath,
    isWifeGuardNativeApiPath,
    isWifeUnsignedApiPath,
} from '@/app/security/wifePublicApi';

describe('wifePublicApi path policy', () => {
    it('marks /api/public as unsigned', () => {
        expect(isWifeUnsignedApiPath('/api/public/healthz')).toBe(true);
        expect(isWifeUnsignedApiPath('/api/public/readyz')).toBe(true);
        expect(isWifeUnsignedApiPath('/api/forum/posts')).toBe(false);
    });

    it('marks auth and wife-sign bootstrap as native for the fetch guard', () => {
        expect(isWifeBootstrapApiPath('/api/security/wife-sign')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/security/wife-sign/')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/auth/login')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/auth/logout')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/auth/refresh')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/auth/forgot-password')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/auth/resend-confirmation')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/auth/otp/request')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/auth/otp/complete')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/auth/otp/channels')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/auth/otp/preview')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/admin/verify')).toBe(true);
        expect(isWifeGuardNativeApiPath('/api/admin/verify')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/admin/otp/csrf')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/admin/otp/request')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/admin/otp/verify')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/admin/otp/status')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/admin/otp/dev-unlock')).toBe(true);
        expect(isWifeGuardNativeApiPath('/api/admin/otp/csrf')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/security/csrf')).toBe(false);
        expect(isWifeGuardNativeApiPath('/api/security/csrf')).toBe(false);
        expect(isWifeBootstrapApiPath('/api/forum/posts')).toBe(false);
        expect(isWifeGuardNativeApiPath('/api/security/wife-sign')).toBe(true);
        expect(isWifeBootstrapApiPath('/api/security/wife-session')).toBe(false);
        expect(isWifeGuardNativeApiPath('/api/security/wife-session')).toBe(false);
        expect(isWifeGuardNativeApiPath('/api/public/bff')).toBe(true);
        expect(isWifeGuardNativeApiPath('/api/kv-proxy')).toBe(false);
    });
});

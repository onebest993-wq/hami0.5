import { describe, expect, it } from 'vitest';
import { SecureFetchError } from '@/app/services/SecureAPIClient';
import {
    humanizeUnknownError,
    humanizeUserErrorMessage,
    isSilentOfflineError,
} from '@/app/utils/humanizeAppError';

describe('humanizeAppError', () => {
    it('suppresses api_unavailable toast text', () => {
        expect(humanizeUserErrorMessage('api_unavailable')).toBeNull();
        expect(humanizeUserErrorMessage('kv_local_only')).toBeNull();
    });

    it('maps unauthenticated to Arabic', () => {
        expect(humanizeUserErrorMessage('unauthenticated')).toBe('يرجى تسجيل الدخول أولاً.');
    });

    it('passes through normal Arabic messages', () => {
        expect(humanizeUserErrorMessage('تعذّر الحفظ')).toBe('تعذّر الحفظ');
    });

    it('detects silent SecureFetchError offline errors', () => {
        const err = new SecureFetchError('api_unavailable', 503, '', '/api/kv');
        expect(isSilentOfflineError(err)).toBe(true);
        expect(humanizeUnknownError(err)).toBeNull();
    });
});

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { GUEST_LAWYER_ID } from '@/app/utils/guestLawyerSession';
import {
    canUseNetworkFeatures,
    canUseForumNetworkFeatures,
    forumAccessDenialReason,
    lawyerVerificationBannerKind,
    networkAccessDenialMessage,
    networkAccessDenialReason,
    resolveLawyerVerificationStatus,
} from '@/app/services/auth/lawyerAccountStatus';
import {
    markLawyerVerificationUiReady,
    resetLawyerVerificationStoreForTests,
    setLawyerVerificationStatus,
    writeLawyerVerificationPending,
} from '@/app/services/auth/lawyerVerificationStore';
import {
    validateArabicTripleName,
    validateIraqiLawyerPhone,
    validateRegistrationPassword,
} from '@/app/services/auth/iraqiLawyerRegistrationCatalog';
import {
    clearExplicitLocalGuest,
    isExplicitLocalGuest,
    markExplicitLocalGuest,
} from '@/app/services/auth/localGuestSession';

describe('lawyerAccountStatus + local guest', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
        clearExplicitLocalGuest();
        resetLawyerVerificationStoreForTests();
        window.localStorage.clear();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        clearExplicitLocalGuest();
    });

    it('marks explicit local guest flag', () => {
        expect(isExplicitLocalGuest()).toBe(false);
        markExplicitLocalGuest();
        expect(isExplicitLocalGuest()).toBe(true);
        clearExplicitLocalGuest();
        expect(isExplicitLocalGuest()).toBe(false);
    });

    it('يعيد زرع الضيف من الكوكي إن مُسح localStorage', () => {
        markExplicitLocalGuest();
        window.localStorage.removeItem('hami:auth:explicit-local-guest:v1');
        expect(isExplicitLocalGuest()).toBe(true);
        expect(window.localStorage.getItem('hami:auth:explicit-local-guest:v1')).toBe('1');
    });

    it('treats guest as network-denied', () => {
        expect(canUseNetworkFeatures(GUEST_LAWYER_ID)).toBe(false);
        expect(networkAccessDenialReason(GUEST_LAWYER_ID)).toBe('guest');
        expect(networkAccessDenialMessage('guest')).toContain('تسجيل الدخول');
    });

    it('forum network stays closed for guests even if shell auth is open', () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        expect(canUseForumNetworkFeatures(GUEST_LAWYER_ID)).toBe(false);
        expect(canUseForumNetworkFeatures('lawyer-legacy-1')).toBe(false);
    });

    it('forumAccessDenialReason: ضيف / قيد التدقيق / مرفوض', () => {
        expect(forumAccessDenialReason(GUEST_LAWYER_ID)).toBe('guest');
        expect(forumAccessDenialReason('lawyer-legacy-1')).toBe('pending');
        writeLawyerVerificationPending('lawyer-new-1', {
            email: 'a@b.com',
            fullName: 'علي محمد حسن',
            familyName: 'العلي',
            phone: '07701234567',
            governorate: 'بغداد',
            lawyerBarRoom: 'baghdad-central',
            idFrontDataUrl: null,
            idBackDataUrl: null,
            faceSelfieDataUrl: null,
            faceAssistOptedIn: false,
        });
        expect(forumAccessDenialReason('lawyer-new-1')).toBe('pending');
        setLawyerVerificationStatus('lawyer-new-1', 'rejected');
        expect(forumAccessDenialReason('lawyer-new-1')).toBe('rejected');
        setLawyerVerificationStatus('lawyer-new-1', 'active');
        expect(forumAccessDenialReason('lawyer-new-1')).toBeNull();
    });

    it('fail-closes real users without verification record as pending', () => {
        expect(resolveLawyerVerificationStatus('lawyer-legacy-1')).toBe('pending');
        expect(canUseNetworkFeatures('lawyer-legacy-1')).toBe(false);
        expect(networkAccessDenialReason('lawyer-legacy-1')).toBe('pending');
    });

    it('does not trust metadata-only active for network (aligns with server KV)', () => {
        expect(
            resolveLawyerVerificationStatus('lawyer-legacy-1', { verificationStatus: 'active' }),
        ).toBe('pending');
        expect(canUseNetworkFeatures('lawyer-legacy-1', { verificationStatus: 'active' })).toBe(false);
    });

    it('يعتمد app_metadata من المقر حتى لو بقي السجل المحلي قيد التدقيق', () => {
        writeLawyerVerificationPending('lawyer-new-1', {
            email: 'a@b.com',
            fullName: 'علي محمد حسن',
            familyName: 'العلي',
            phone: '07701234567',
            governorate: 'بغداد',
            lawyerBarRoom: 'baghdad-central',
            idFrontDataUrl: null,
            idBackDataUrl: null,
            faceSelfieDataUrl: null,
            faceAssistOptedIn: false,
        });
        expect(resolveLawyerVerificationStatus('lawyer-new-1')).toBe('pending');
        expect(
            resolveLawyerVerificationStatus(
                'lawyer-new-1',
                { verificationStatus: 'pending' },
                { verification_status: 'active' },
            ),
        ).toBe('active');
        expect(
            canUseNetworkFeatures(
                'lawyer-new-1',
                { verificationStatus: 'pending' },
                { verification_status: 'active' },
            ),
        ).toBe(true);
        expect(
            lawyerVerificationBannerKind(
                'lawyer-new-1',
                { verificationStatus: 'pending' },
                { verification_status: 'active' },
            ),
        ).toBeNull();
    });

    it('السجل المحلي pending يتقدّم على app_metadata rejected بعد إعادة الرفع', () => {
        writeLawyerVerificationPending('lawyer-new-1', {
            email: 'a@b.com',
            fullName: 'علي محمد حسن',
            familyName: 'العلي',
            phone: '07701234567',
            governorate: 'بغداد',
            lawyerBarRoom: 'baghdad-central',
            idFrontDataUrl: null,
            idBackDataUrl: null,
            faceSelfieDataUrl: null,
            faceAssistOptedIn: false,
        });
        expect(
            resolveLawyerVerificationStatus(
                'lawyer-new-1',
                {},
                { verification_status: 'rejected' },
            ),
        ).toBe('pending');
        expect(
            forumAccessDenialReason('lawyer-new-1', {}, { verification_status: 'rejected' }),
        ).toBe('pending');
    });

    it('allows network when local verification record is active', () => {
        writeLawyerVerificationPending('lawyer-new-1', {
            email: 'a@b.com',
            fullName: 'علي محمد حسن',
            familyName: 'العلي',
            phone: '07701234567',
            governorate: 'بغداد',
            lawyerBarRoom: 'baghdad-central',
            idFrontDataUrl: null,
            idBackDataUrl: null,
            faceSelfieDataUrl: null,
            faceAssistOptedIn: false,
        });
        setLawyerVerificationStatus('lawyer-new-1', 'active');
        expect(resolveLawyerVerificationStatus('lawyer-new-1')).toBe('active');
        expect(canUseNetworkFeatures('lawyer-new-1')).toBe(true);
    });

    it('blocks network for pending registration', () => {
        writeLawyerVerificationPending('lawyer-new-1', {
            email: 'a@b.com',
            fullName: 'علي محمد حسن',
            familyName: 'العلي',
            phone: '07701234567',
            governorate: 'بغداد',
            lawyerBarRoom: 'baghdad-central',
            idFrontDataUrl: 'data:image/png;base64,abc',
            idBackDataUrl: null,
            faceSelfieDataUrl: null,
            faceAssistOptedIn: false,
        });
        expect(resolveLawyerVerificationStatus('lawyer-new-1')).toBe('pending');
        expect(canUseNetworkFeatures('lawyer-new-1')).toBe(false);
        expect(networkAccessDenialReason('lawyer-new-1')).toBe('pending');
        expect(networkAccessDenialMessage('pending')).toContain('قيد التدقيق');
    });

    it('شريط التدقيق لا يومض pending قبل المزامنة أو مع metadata=active', () => {
        expect(lawyerVerificationBannerKind('lawyer-legacy-1')).toBeNull();
        expect(
            lawyerVerificationBannerKind('lawyer-legacy-1', { verificationStatus: 'active' }),
        ).toBeNull();
        expect(
            lawyerVerificationBannerKind('lawyer-legacy-1', { verificationStatus: 'pending' }),
        ).toBe('pending');

        writeLawyerVerificationPending('lawyer-new-1', {
            email: 'a@b.com',
            fullName: 'علي محمد حسن',
            familyName: 'العلي',
            phone: '07701234567',
            governorate: 'بغداد',
            lawyerBarRoom: 'baghdad-central',
            idFrontDataUrl: null,
            idBackDataUrl: null,
            faceSelfieDataUrl: null,
            faceAssistOptedIn: false,
        });
        expect(lawyerVerificationBannerKind('lawyer-new-1')).toBeNull();
        markLawyerVerificationUiReady('lawyer-new-1');
        expect(lawyerVerificationBannerKind('lawyer-new-1')).toBe('pending');
        setLawyerVerificationStatus('lawyer-new-1', 'active');
        expect(lawyerVerificationBannerKind('lawyer-new-1')).toBeNull();
    });

    it('validates registration catalog rules', () => {
        expect(validateIraqiLawyerPhone('07701234567')).toBe(true);
        expect(validateIraqiLawyerPhone('0512345678')).toBe(false);
        expect(validateArabicTripleName('علي محمد حسن')).toBe(true);
        expect(validateArabicTripleName('علي محمد')).toBe(false);
        expect(validateRegistrationPassword('short')).not.toBeNull();
        expect(validateRegistrationPassword('كلمةسر12')).not.toBeNull();
        expect(validateRegistrationPassword('SecureLaw9')).toBeNull();
        expect(validateRegistrationPassword('PASSWORD1')).toBeNull();
        expect(validateRegistrationPassword('12345678')).not.toBeNull();
    });
});

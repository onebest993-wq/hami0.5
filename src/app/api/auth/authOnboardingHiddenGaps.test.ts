/**
 * حملة سيناريوهات خفية — تسجيل / توثيق / مقر / منتدى / هوية بعد إعادة التسجيل.
 * ليست اختبار اختراق حي؛ عقود ضد الرجوع للثغرات التي ظهرت في الجلسات السابقة.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { pickForumTileProfilePaintState } from '@/app/components/lawyer/dashboard/forumProfile/pickForumTileProfilePaintState';
import { resolveHqDirectoryKycStatus } from '@/app/domain/admin/hqUserPresence';
import {
    canUseForumNetworkFeatures,
    resolveLawyerVerificationStatus,
} from '@/app/services/auth/lawyerAccountStatus';
import {
    LAWYER_VERIFICATION_HQ_RECEIVED_AR,
    LAWYER_VERIFICATION_HQ_UNREACHABLE_AR,
} from '@/app/services/auth/lawyerVerificationRemote';
import { hqVerificationHasIdentityPair } from '@/app/api/auth/lawyer-verification/hqVerificationQueueRecord';
import {
    getUserIdentityUiState,
    publishUserIdentityUiState,
    resetUserIdentityUiStateForTests,
} from '@/app/services/profile/userIdentityUiState';
import { setLiveAuthUserId } from '@/app/utils/liveAuthUserId';
import {
    isLawyerProfileBootWarmPending,
    setLawyerProfileBootWarmPending,
} from '@/app/services/profile/profileBootWarmPending';
import {
    resetLawyerVerificationStoreForTests,
    writeLawyerVerificationPending,
} from '@/app/services/auth/lawyerVerificationStore';

vi.mock('@/app/services/profile/lawyerProfileLocalRead', () => ({
    readLocalProfileSync: vi.fn(() => null),
    isLawyerProfileLocalUnread: vi.fn(() => false),
    lawyerProfileLocalRecordExists: vi.fn(() => false),
}));

vi.mock('@/app/utils/authStorage', () => ({
    readPersistedSupabaseAuth: vi.fn(() => ({ user: null, session: null })),
    readDevMockUser: vi.fn(() => null),
}));

const GAP = '49d464e5-bd75-4105-bdb9-fd18fc647854';

describe('auth onboarding hidden-gap scenarios', () => {
    beforeEach(() => {
        resetUserIdentityUiStateForTests();
        resetLawyerVerificationStoreForTests();
        setLawyerProfileBootWarmPending(false);
        setLiveAuthUserId(null);
    });

    it('حساب بلا اسم يستقر بعد التسخين ولا يبقى aria-busy إلى الأبد', () => {
        const state = pickForumTileProfilePaintState(
            'lawyer-new-nameless',
            { accountType: 'lawyer', verificationStatus: 'pending' },
            '',
            '',
            '',
        );
        expect(state.displayName).toBe('');
        expect(state.isLoaded).toBe(true);
    });

    it('تبديل الحساب يصفّر هوية الواجهة العالقة من الحساب السابق', () => {
        setLiveAuthUserId(null);
        publishUserIdentityUiState({
            userId: 'lawyer-a',
            displayName: 'أحمد مهدي',
            avatarUrl: '',
            profileInitial: 'أ',
            isLoaded: true,
        });
        setLiveAuthUserId('lawyer-a');
        expect(getUserIdentityUiState('lawyer-a')?.displayName).toBe('أحمد مهدي');
        setLawyerProfileBootWarmPending(true);
        setLiveAuthUserId('lawyer-b');
        expect(getUserIdentityUiState('lawyer-a')).toBeNull();
        expect(isLawyerProfileBootWarmPending()).toBe(false);
    });

    it('بلا صف KV: المنتدى العميل قد يرى اعتماد app_metadata بينما الدليل لا يخفيه كـ بلا طلب', () => {
        expect(resolveLawyerVerificationStatus(GAP, {}, { verification_status: 'active' })).toBe(
            'active',
        );
        expect(canUseForumNetworkFeatures(GAP, {}, { verification_status: 'active' })).toBe(true);
        expect(resolveHqDirectoryKycStatus(undefined, true, 'active')).toBe('active');
        expect(resolveHqDirectoryKycStatus(undefined, true, 'none')).toBe('none');
        expect(resolveHqDirectoryKycStatus(undefined, true, 'pending')).toBe('pending');
    });

    it('قبول الهوية يتطلب الوجه والظهر — الصف المزروع بلا وثائق لا يُعتمد', () => {
        expect(hqVerificationHasIdentityPair({ hasIdFront: false, hasIdBack: false })).toBe(false);
        expect(hqVerificationHasIdentityPair({ hasIdFront: true, hasIdBack: false })).toBe(false);
        expect(hqVerificationHasIdentityPair({ hasIdFront: true, hasIdBack: true })).toBe(true);
    });

    it('رسائل الإكمال لا تتطابق: نجاح المقر ≠ فشل الإرسال', () => {
        expect(LAWYER_VERIFICATION_HQ_RECEIVED_AR).toMatch(/وصل طلبك إلى الإدارة/);
        expect(LAWYER_VERIFICATION_HQ_UNREACHABLE_AR).not.toMatch(/وصل طلبك إلى الإدارة/);
        expect(LAWYER_VERIFICATION_HQ_UNREACHABLE_AR).toMatch(/لم تستلم الطلب/);
    });

    it('user_metadata=active لا يفتح الواجهة — app_metadata فقط', () => {
        expect(
            resolveLawyerVerificationStatus(GAP, { verificationStatus: 'active' }, {}),
        ).toBe('pending');
        expect(
            resolveLawyerVerificationStatus(GAP, { verificationStatus: 'active' }, {
                verification_status: 'active',
            }),
        ).toBe('active');
    });

    it('إعادة الرفع المحلي pending تتقدّم على app_metadata rejected البالي', () => {
        writeLawyerVerificationPending(GAP, {
            email: 'a@b.com',
            fullName: 'علي محمد حسن',
            familyName: 'العلي',
            phone: '07719876543',
            governorate: 'بغداد',
            lawyerBarRoom: 'غرفة محاميي بغداد',
            idFrontDataUrl: null,
            idBackDataUrl: null,
            faceSelfieDataUrl: null,
            faceAssistOptedIn: false,
        });
        expect(
            resolveLawyerVerificationStatus(GAP, {}, { verification_status: 'rejected' }),
        ).toBe('pending');
    });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const writePendingMock = vi.fn();
const submitMock = vi.fn();
const setLiveAuthUserIdMock = vi.fn();

vi.mock('@/app/services/auth/lawyerVerificationStore', () => ({
    writeLawyerVerificationPending: (...args: unknown[]) => writePendingMock(...args),
}));

vi.mock('@/app/services/auth/lawyerVerificationRemote', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/auth/lawyerVerificationRemote')>();
    return {
        ...actual,
        submitLawyerVerificationToServer: (...args: unknown[]) => submitMock(...args),
    };
});

vi.mock('@/app/utils/liveAuthUserId', () => ({
    setLiveAuthUserId: (...args: unknown[]) => setLiveAuthUserIdMock(...args),
    resolveLiveAuthUserIdForStorage: () => null,
}));

vi.mock('@/app/utils/auditLog', () => ({
    logAction: vi.fn(async () => undefined),
}));

import { authFinalizeLawyerOnboarding } from '@/app/context/authProviderRuntime';
import {
    LAWYER_VERIFICATION_HQ_RECEIVED_AR,
    LAWYER_VERIFICATION_HQ_UNREACHABLE_AR,
} from '@/app/services/auth/lawyerVerificationRemote';

const UID = '49d464e5-bd75-4105-bdb9-fd18fc647854';
const jpeg = `data:image/jpeg;base64,${'A'.repeat(80)}`;

const base = {
    email: 'lawyer@gmail.com',
    phone: '07719876543',
    fullName: 'علي محمد حسن',
    familyName: 'العلي',
    governorate: 'بغداد',
    lawyerBarRoom: 'غرفة محاميي بغداد',
    idFrontDataUrl: jpeg,
    idBackDataUrl: jpeg,
    faceSelfieDataUrl: null as string | null,
    faceAssistOptedIn: false,
    userId: UID,
};

describe('authFinalizeLawyerOnboarding', () => {
    beforeEach(() => {
        writePendingMock.mockReset();
        submitMock.mockReset();
        setLiveAuthUserIdMock.mockReset();
        submitMock.mockResolvedValue(undefined);
    });

    it('يحفظ محلياً ويقول إن الإدارة استلمت الطلب عند نجاح الإرسال', async () => {
        const result = await authFinalizeLawyerOnboarding(base);
        expect(writePendingMock).toHaveBeenCalledTimes(1);
        expect(submitMock).toHaveBeenCalledTimes(1);
        expect(result.hqReceived).toBe(true);
        expect(result.pendingMessage).toBe(LAWYER_VERIFICATION_HQ_RECEIVED_AR);
    });

    it('لا يدّعي وصول الطلب للإدارة إن فشل الإرسال — السجل المحلي يبقى', async () => {
        submitMock.mockRejectedValue(new Error('network'));
        const result = await authFinalizeLawyerOnboarding(base);
        expect(writePendingMock).toHaveBeenCalledTimes(1);
        expect(result.hqReceived).toBe(false);
        expect(result.pendingMessage).toBe(LAWYER_VERIFICATION_HQ_UNREACHABLE_AR);
        expect(result.pendingMessage).not.toMatch(/وصل طلبك إلى الإدارة/);
    });
});

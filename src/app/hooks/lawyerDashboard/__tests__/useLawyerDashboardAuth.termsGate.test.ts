import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { useLawyerDashboardAuth } from '@/app/hooks/lawyerDashboard/useLawyerDashboardAuth';
import {
    clearLegalTermsAcceptance,
    hasAcceptedCurrentLegalTerms,
    markLegalTermsAccepted,
} from '@/app/services/auth/legalTermsAcceptance';

vi.mock('@/app/bootstrap/LawyerSignInGate', () => ({
    LawyerSignInGate: () => null,
}));

vi.mock('@/app/bootstrap/lawyerAuth/LawyerPasswordResetForm', () => ({
    LawyerPasswordResetForm: () => null,
}));

vi.mock('@/app/bootstrap/lawyerAuth/LegalTermsConsentGate', () => ({
    LegalTermsConsentGate: () => null,
}));

vi.mock('@/app/bootstrap/lawyerAuth/LawyerRegistrationReviewHold', () => ({
    LawyerRegistrationReviewHold: () => null,
}));

vi.mock('@/app/services/auth/devMockLawyerAuth', () => ({
    resolveDevMockLawyerUser: (u: unknown) => u ?? null,
}));

describe('useLawyerDashboardAuth — بوابة الشروط', () => {
    beforeEach(async () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
        clearLegalTermsAcceptance();
        window.localStorage.clear();
        const { clearRegistrationReviewHold } = await import(
            '@/app/services/auth/registrationReviewHold'
        );
        clearRegistrationReviewHold();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        clearLegalTermsAcceptance();
    });

    it('بلا قبول وجلسة فارغة تظهر بوابة الدخول (الاختيار) لا الشروط أولاً', () => {
        const { result } = renderHook(() => useLawyerDashboardAuth({ authUser: null }));
        expect(result.current.authGate).not.toBeNull();
        expect(result.current.user).toBeNull();
        /* الشروط تُفتح من LawyerAuthGate بعد اختيار المسار — لا قبل الاختيار */
        expect(result.current.authGate).toBeTruthy();
    });

    it('بعد القبول وغياب الجلسة تظهر بوابة الدخول لا الشروط فقط', () => {
        markLegalTermsAccepted();
        const { result } = renderHook(() => useLawyerDashboardAuth({ authUser: null }));
        expect(result.current.authGate).not.toBeNull();
    });

    it('يعرض بوابة استعادة كلمة المرور عند علامة الاستعادة', async () => {
        markLegalTermsAccepted();
        const { markPasswordRecoveryPending, clearPasswordRecoveryPending } = await import(
            '@/app/services/auth/passwordRecoveryGate'
        );
        markPasswordRecoveryPending();
        const { result } = renderHook(() => useLawyerDashboardAuth({ authUser: { id: 'u1' } as never }));
        await waitFor(() => {
            expect(result.current.authGate).not.toBeNull();
        });
        clearPasswordRecoveryPending();
    });

    it('يحجب لوحة مستخدم حقيقي حتى قبول الشروط', () => {
        const blocked = renderHook(() =>
            useLawyerDashboardAuth({ authUser: { id: 'lawyer-1' } as never }),
        );
        expect(blocked.result.current.authGate).not.toBeNull();

        markLegalTermsAccepted();
        const allowed = renderHook(() =>
            useLawyerDashboardAuth({ authUser: { id: 'lawyer-1' } as never }),
        );
        expect(allowed.result.current.authGate).toBeNull();
        expect(allowed.result.current.user?.id).toBe('lawyer-1');
    });

    it('لا يعرض حاوية الدخول أثناء مزامنة الجلسة', () => {
        markLegalTermsAccepted();
        const { result } = renderHook(() =>
            useLawyerDashboardAuth({ authUser: null, authHydrating: true }),
        );
        expect(result.current.authGate).not.toBeNull();
        const { container } = render(result.current.authGate as ReactElement);
        expect(container.querySelector('[data-testid="lawyer-auth-gate-loading"]')).toBeTruthy();
        expect(container.querySelector('[data-testid="lawyer-sign-in-gate"]')).toBeNull();
    });

    it('يزيل بوابة الدخول فور وصول المستخدم دون انتظار effect', () => {
        markLegalTermsAccepted();
        const { result, rerender } = renderHook(
            ({ user }) => useLawyerDashboardAuth({ authUser: user, authHydrating: false }),
            { initialProps: { user: null as { id: string } | null } },
        );
        expect(result.current.authGate).not.toBeNull();
        rerender({ user: { id: 'lawyer-1' } });
        expect(result.current.user?.id).toBe('lawyer-1');
        expect(result.current.authGate).toBeNull();
    });

    it('بعد القبول لا تُعاد الشروط عند تحوّل المستخدم إلى null (خروج)', () => {
        markLegalTermsAccepted();
        const { result, rerender } = renderHook(
            ({ user }) => useLawyerDashboardAuth({ authUser: user }),
            { initialProps: { user: { id: 'lawyer-1' } as { id: string } | null } },
        );
        expect(result.current.authGate).toBeNull();
        rerender({ user: null });
        expect(hasAcceptedCurrentLegalTerms()).toBe(true);
        expect(result.current.user).toBeNull();
        expect(result.current.authGate).not.toBeNull();
    });
});

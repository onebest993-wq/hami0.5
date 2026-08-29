import { createElement, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import { prefetchAccountLegalDocuments } from '@/app/components/lawyer/HamiSettings/account/accountLegalContentLoad';
import { resolveDevMockLawyerUser } from '@/app/services/auth/devMockLawyerAuth';
import {
    hasAcceptedCurrentLegalTerms,
} from '@/app/services/auth/legalTermsAcceptance';
import { isExplicitDevUnlock } from '@/app/services/auth/devUnlockSession';
import { isExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import {
    clearPasswordRecoveryPending,
    isPasswordRecoveryPending,
    isPasswordRecoveryReturnUrl,
    markPasswordRecoveryPending,
    subscribePasswordRecovery,
} from '@/app/services/auth/passwordRecoveryGate';
import {
    readRegistrationReviewHold,
    subscribeRegistrationReviewHold,
} from '@/app/services/auth/registrationReviewHold';
import { isShellAuthBypassed, isShellDemoUserId } from '@/app/services/auth/shellAuth';
import { clearDevMockAuth } from '@/app/utils/authStorage';

export type UseLawyerDashboardAuthParams = {
    authUser: User | null | undefined;
    /** true ريثما يُؤكَّد الخادم الجلسة — لا تُعرض بوابة الدخول في هذه الأثناء */
    authHydrating?: boolean;
};

const LazyLegalTermsConsentGate = lazyWithRetry(() =>
    import('@/app/bootstrap/lawyerAuth/LegalTermsConsentGate').then((m) => ({
        default: m.LegalTermsConsentGate as unknown as LazyComponent,
    })),
);

const LazyLawyerPasswordResetGate = lazyWithRetry(() =>
    import('@/app/bootstrap/lawyerAuth/LawyerPasswordResetGate').then((m) => ({
        default: m.LawyerPasswordResetGate as unknown as LazyComponent,
    })),
);

const LazyLawyerSignInGate = lazyWithRetry(() =>
    import('@/app/bootstrap/LawyerSignInGate').then((m) => ({
        default: m.LawyerSignInGate as unknown as LazyComponent,
    })),
);

const LazyLawyerRegistrationReviewHold = lazyWithRetry(() =>
    import('@/app/bootstrap/lawyerAuth/LawyerRegistrationReviewHold').then((m) => ({
        default: m.LawyerRegistrationReviewHold as unknown as LazyComponent,
    })),
);

const authGateFallback = createElement('div', {
    className: 'min-h-screen w-full hami-board-canvas-bg',
    'data-testid': 'lawyer-auth-gate-loading',
    'aria-busy': true,
    'aria-label': 'تهيئة بوابة الدخول',
});

function wrapAuthGate(node: ReactNode) {
    return createElement(Suspense, { fallback: authGateFallback }, node);
}

function resolveGateUser(authUser: User | null | undefined): User | null {
    const resolved = resolveDevMockLawyerUser(authUser);
    if (!resolved) return null;
    // ضيف قديم في التخزين بدون اختيار «بدون تسجيل» → اعتبره بلا جلسة
    if (
        !isShellAuthBypassed() &&
        isShellDemoUserId(resolved.id) &&
        !isExplicitLocalGuest() &&
        !isExplicitDevUnlock()
    ) {
        return null;
    }
    return resolved;
}

export function useLawyerDashboardAuth({
    authUser,
    authHydrating = false,
}: UseLawyerDashboardAuthParams) {
    const resolved = resolveGateUser(authUser);
    const authUserId = authUser?.id ?? null;
    const [user, setUser] = useState<User | null>(() => resolved);
    const [seenAuthUserId, setSeenAuthUserId] = useState<string | null>(authUserId);
    const [termsAccepted, setTermsAccepted] = useState(() => hasAcceptedCurrentLegalTerms());
    const [passwordRecovery, setPasswordRecovery] = useState(() => isPasswordRecoveryPending());
    const [reviewHold, setReviewHold] = useState(() => readRegistrationReviewHold());
    const authUserRef = useRef(authUser);
    authUserRef.current = authUser;

    if (authUserId !== seenAuthUserId) {
        setSeenAuthUserId(authUserId);
        setUser(resolved);
    }

    useEffect(() => {
        setReviewHold(readRegistrationReviewHold());
        return subscribeRegistrationReviewHold(() => {
            setReviewHold(readRegistrationReviewHold());
        });
    }, []);

    useEffect(() => {
        if (isPasswordRecoveryReturnUrl()) {
            markPasswordRecoveryPending();
        }
        setPasswordRecovery(isPasswordRecoveryPending());
        return subscribePasswordRecovery(() => {
            setPasswordRecovery(isPasswordRecoveryPending());
        });
    }, []);

    useEffect(() => {
        const current = authUserRef.current;
        const next = resolveGateUser(current);
        if (
            !next &&
            current &&
            isShellDemoUserId(current.id) &&
            !isShellAuthBypassed() &&
            !isExplicitLocalGuest() &&
            !isExplicitDevUnlock()
        ) {
            clearDevMockAuth();
        }
        setUser((prev: User | null) => (prev?.id === next?.id ? prev : next));
    }, [authUserId]);

    useEffect(() => {
        const syncTerms = () => {
            const next = hasAcceptedCurrentLegalTerms();
            setTermsAccepted((prev) => (prev === next ? prev : next));
        };
        syncTerms();
        if (typeof window === 'undefined') return undefined;
        window.addEventListener('hami:data-cleared', syncTerms);
        window.addEventListener('hami:legal-terms-accepted', syncTerms);
        return () => {
            window.removeEventListener('hami:data-cleared', syncTerms);
            window.removeEventListener('hami:legal-terms-accepted', syncTerms);
        };
    }, [authUserId]);

    useEffect(() => {
        if (!termsAccepted) prefetchAccountLegalDocuments();
    }, [termsAccepted]);

    const authGate = useMemo(() => {
        if (isShellAuthBypassed()) return null;
        /* استعادة كلمة المرور تتقدّم حتى لو وُجدت جلسة recovery */
        if (passwordRecovery) {
            return wrapAuthGate(
                createElement(LazyLawyerPasswordResetGate, {
                    onCompleted: () => {
                        clearPasswordRecoveryPending();
                        setPasswordRecovery(false);
                    },
                    onCancelToLogin: () => {
                        clearPasswordRecoveryPending();
                        setPasswordRecovery(false);
                        void import('@/app/utils/authSupabaseLazy')
                            .then((m) => m.signOutSupabase())
                            .catch(() => undefined);
                        setUser(null);
                    },
                }),
            );
        }
        if (reviewHold) {
            return wrapAuthGate(createElement(LazyLawyerRegistrationReviewHold));
        }
        /*
         * جلسة قائمة بلا قبول شروط → الوثيقة كاملة (لا بطاقة اختيار).
         * بلا جلسة → بطاقة الاختيار أولاً؛ الشروط تُفتح من LawyerAuthGate عند المسار.
         */
        if (!termsAccepted && user) {
            return wrapAuthGate(
                createElement(LazyLegalTermsConsentGate, {
                    onAccepted: () => setTermsAccepted(true),
                }),
            );
        }
        if (user) return null;
        if (authHydrating) return authGateFallback;
        return wrapAuthGate(createElement(LazyLawyerSignInGate));
    }, [termsAccepted, passwordRecovery, reviewHold, user, authHydrating]);

    return { user, setUser, authLoading: authHydrating, authGate };
}

import React, { Suspense, lazy, useEffect, useState, type ReactElement } from 'react';

import '@/app/bootstrap/lawyerAuth/authGateSurface.css';
import { LawyerAuthChoiceCard } from '@/app/bootstrap/lawyerAuth/LawyerAuthChoiceCard';
import {
    LazyLawyerRegisterWizard,
    LazyLawyerSignInForm,
    prefetchAuthGateForms,
} from '@/app/bootstrap/lawyerAuth/authGateLazy';
import { authGatePanelClass, authGateShellClass } from '@/app/bootstrap/lawyerAuth/authGateStyles';
import { useBootGateSurfaceReady } from '@/app/bootstrap/useBootGateSurfaceReady';
import { useAuth } from '@/app/context/authHooks';
import {
    consumePreferredAuthGateMode,
    peekPreferredAuthGateMode,
    setPreferredAuthGateMode,
} from '@/app/services/auth/authGatePreferredMode';
import {
    hasAcceptedCurrentLegalTerms,
} from '@/app/services/auth/legalTermsAcceptance';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';

type GateMode = 'choice' | 'login' | 'register' | 'terms';
type PendingAfterTerms = 'login' | 'register' | 'guest' | 'dev';

const LazyLegalTermsConsentGate = lazy(() =>
    import('@/app/bootstrap/lawyerAuth/LegalTermsConsentGate').then((m) => ({
        default: m.LegalTermsConsentGate,
    })),
);

function readInitialGateState(): {
    mode: GateMode;
    pendingAfterTerms: PendingAfterTerms | null;
} {
    const preferred = peekPreferredAuthGateMode() ?? consumePreferredAuthGateMode();
    if (preferred === 'login' || preferred === 'register') {
        if (!hasAcceptedCurrentLegalTerms()) {
            return { mode: 'terms', pendingAfterTerms: preferred };
        }
        return { mode: preferred, pendingAfterTerms: null };
    }
    return { mode: 'choice', pendingAfterTerms: null };
}

/**
 * بوابة المصادقة الإنتاجية.
 * الترتيب المعتمد: اختيار المسار أولاً → وثيقة الشروط كاملة عند الحاجة → النموذج.
 */
export function LawyerAuthGate(): ReactElement {
    useBootGateSurfaceReady();
    const { enterLocalGuest, devBypassLogin } = useAuth();
    const initial = readInitialGateState();
    const [mode, setModeState] = useState<GateMode>(initial.mode);
    const [pendingAfterTerms, setPendingAfterTerms] = useState<PendingAfterTerms | null>(
        initial.pendingAfterTerms,
    );
    const setMode = (next: GateMode) => {
        if (next === 'login' || next === 'register' || next === 'choice') {
            setPreferredAuthGateMode(next);
        }
        setModeState(next);
    };
    const [guestLoading, setGuestLoading] = useState(false);
    const [devLoading, setDevLoading] = useState(false);
    const [guestError, setGuestError] = useState('');

    useEffect(() => {
        if (mode !== 'choice') return undefined;
        if (import.meta.env.MODE === 'test') return undefined;
        return scheduleIdleWork(prefetchAuthGateForms, 1200);
    }, [mode]);

    const requireTermsThen = (action: PendingAfterTerms) => {
        if (hasAcceptedCurrentLegalTerms()) {
            if (action === 'guest') {
                void onGuest();
                return;
            }
            if (action === 'dev') {
                void onDevUnlock();
                return;
            }
            setMode(action);
            return;
        }
        setPendingAfterTerms(action);
        setModeState('terms');
    };

    const onGuest = async () => {
        setGuestError('');
        setGuestLoading(true);
        try {
            await enterLocalGuest();
        } catch (e) {
            setGuestError(e instanceof Error ? e.message : 'تعذّر الدخول المحلي');
        } finally {
            setGuestLoading(false);
        }
    };

    const onDevUnlock = async () => {
        setGuestError('');
        setDevLoading(true);
        try {
            await devBypassLogin();
        } catch (e) {
            setGuestError(e instanceof Error ? e.message : 'تعذّر دخول المطوّر');
        } finally {
            setDevLoading(false);
        }
    };

    const onTermsAccepted = () => {
        const next = pendingAfterTerms;
        setPendingAfterTerms(null);
        if (next === 'guest') {
            setModeState('choice');
            void onGuest();
            return;
        }
        if (next === 'dev') {
            setModeState('choice');
            void onDevUnlock();
            return;
        }
        if (next === 'login' || next === 'register') {
            setMode(next);
            return;
        }
        setMode('choice');
    };

    if (mode === 'terms') {
        return (
            <Suspense
                fallback={
                    <div
                        className="min-h-screen w-full hami-board-canvas-bg"
                        data-testid="lawyer-auth-gate-loading"
                        aria-busy
                    />
                }
            >
                <LazyLegalTermsConsentGate
                    onAccepted={onTermsAccepted}
                    onBack={() => {
                        setPendingAfterTerms(null);
                        setMode('choice');
                    }}
                />
            </Suspense>
        );
    }

    return (
        <div
            className={authGateShellClass}
            data-testid="lawyer-sign-in-gate"
            data-hami-auth-gate=""
            role="main"
            aria-label="بوابة الدخول"
        >
            <div className={authGatePanelClass}>
                {mode === 'login' ? (
                    <Suspense fallback={null}>
                        <LazyLawyerSignInForm onBack={() => setMode('choice')} />
                    </Suspense>
                ) : null}
                {mode === 'register' ? (
                    <Suspense fallback={null}>
                        <LazyLawyerRegisterWizard onBack={() => setMode('choice')} />
                    </Suspense>
                ) : null}
                {mode === 'choice' ? (
                    <LawyerAuthChoiceCard
                        guestLoading={guestLoading}
                        guestError={guestError}
                        devLoading={devLoading}
                        onLogin={() => requireTermsThen('login')}
                        onRegister={() => requireTermsThen('register')}
                        onGuest={() => requireTermsThen('guest')}
                        onDevUnlock={() => requireTermsThen('dev')}
                        onPrefetchForms={prefetchAuthGateForms}
                    />
                ) : null}
            </div>
        </div>
    );
}

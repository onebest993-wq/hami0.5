import React, { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { cn } from '@/app/components/ui/utils';
import { DeviceTrustService } from '@/app/domain/admin/deviceTrust';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { BlankDocumentLayer } from '@/app/components/admin/blankDocumentSurface';
import { useDocumentHold } from '@/app/components/admin/useDocumentHold';
import '@/app/bootstrap/lawyerAuth/authGateSurface.css';
import {
    authGateCardClass,
    authGateErrorClass,
    authGateGhostBtnClass,
    authGateHintClass,
    authGateInputClass,
    authGateLabelClass,
    authGateLabelTextClass,
    authGatePanelClass,
    authGatePrimaryBtnClass,
    authGateShellClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';
import {
    fetchAdminDeviceTrustStatus,
    requestAdminHeadquartersOtp,
    verifyAdminHeadquartersOtp,
} from '@/app/services/admin/adminHeadquartersOtpClient';
import { warmLiveHeadquartersApis } from '@/app/services/admin/hqDevSessionWarm';

export type TrustedDeviceGatePhase = 'checking' | 'request' | 'verify';

export type RequireTrustedDeviceProps = {
    children: ReactNode;
    className?: string;
    onSessionRequired?: () => void;
};

const UNOBTAINABLE_PROBE_RETRY_MS = 280;

/**
 * Gate for Admin Headquarters — server OTP + trusted device record.
 * بعد إثبات أن الجلسة هي مدير المنصّة: نرسل الرمز إلى البريد الرسمي
 * ونوقف الدخول حتى يُدخل الرمز يدوياً. لا تخطٍّ تلقائي لرمز جديد.
 * تخطّي البوابة عندما يُؤكّد الخادم الثقة، أو عندما يبقى كاش هذا المتصفح
 * بعد نجاح الرمز — يُمسح فقط بإنهاء الجلسة الناجح.
 */
export function RequireTrustedDevice({ children, className, onSessionRequired }: RequireTrustedDeviceProps) {
    const otpFieldId = useId();
    const [trusted, setTrusted] = useState(false);
    const [phase, setPhase] = useState<TrustedDeviceGatePhase>('checking');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [sentNotice, setSentNotice] = useState<string | null>(null);
    const [verifyNeedsLogin, setVerifyNeedsLogin] = useState(false);
    const [busy, setBusy] = useState(false);
    const [probeEpoch, setProbeEpoch] = useState(0);
    const autoStartedRef = useRef(false);
    const onSessionRequiredRef = useRef(onSessionRequired);
    onSessionRequiredRef.current = onSessionRequired;
    const { holdActive, beginHold } = useDocumentHold(() => setTrusted(true));

    useEffect(() => {
        removeStaticBootShell({ force: true, instant: true });
        try {
            document.documentElement.removeAttribute('data-hami-initial-boot');
            document.documentElement.classList.remove('hami-boot-static-active');
            document.body.style.pointerEvents = 'auto';
        } catch {
            /* ignore */
        }

        let cancelled = false;
        setPhase('checking');
        setError(null);
        setVerifyNeedsLogin(false);
        void (async () => {
            let probe = await fetchAdminDeviceTrustStatus();
            if (cancelled) return;
            if (probe === 'unavailable') {
                await new Promise<void>((resolve) => {
                    window.setTimeout(resolve, UNOBTAINABLE_PROBE_RETRY_MS);
                });
                if (cancelled) return;
                probe = await fetchAdminDeviceTrustStatus();
                if (cancelled) return;
            }
            if (probe === 'session_required') {
                autoStartedRef.current = true;
                setVerifyNeedsLogin(true);
                setTrusted(false);
                setError('انتهت جلسة الخادم. سجّل الدخول ثم أعد فتح /admin.');
                return;
            }
            if (probe === 'trusted') {
                setVerifyNeedsLogin(false);
                try {
                    await warmLiveHeadquartersApis();
                } catch {
                    /* النبض الحي يُكمل إن فشل التسخين */
                }
                if (cancelled) return;
                setTrusted(true);
                return;
            }
            if (probe === 'untrusted') {
                autoStartedRef.current = false;
                setVerifyNeedsLogin(false);
                setTrusted(false);
                setPhase('request');
                return;
            }
            if (probe === 'unavailable' && DeviceTrustService.isDeviceTrustedLocally()) {
                setVerifyNeedsLogin(false);
                setTrusted(true);
                return;
            }
            if (probe === 'unavailable') {
                autoStartedRef.current = true;
                setTrusted(false);
                setError('تعذّر التحقق من الجهاز الموثّق. أعد المحاولة دون طلب رمز جديد تلقائياً.');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [probeEpoch]);

    const completeWithCode = useCallback(async (codeRaw: string) => {
        const code = codeRaw.replace(/\D/g, '').slice(0, 6);
        if (code.length !== 6) {
            setError('أدخل رمزاً مكوّناً من 6 أرقام');
            return false;
        }
        const result = await verifyAdminHeadquartersOtp(code);
        if (result.sessionRequired) {
            setVerifyNeedsLogin(true);
            setError(result.error || 'انتهت جلسة الخادم. سجّل الدخول ثم أعد إدخال الرمز.');
            return false;
        }
        setVerifyNeedsLogin(false);
        if (!result.ok) {
            setError(result.error || 'رمز التحقق غير صحيح');
            return false;
        }
        try {
            await warmLiveHeadquartersApis();
        } catch {
            /* النبض الحي يُكمل إن فشل التسخين */
        }
        beginHold();
        return true;
    }, [beginHold]);

    const handleRequestOtp = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const result = await requestAdminHeadquartersOtp();
            if (result.sessionRequired) {
                autoStartedRef.current = true;
                setVerifyNeedsLogin(true);
                setError(result.error || 'انتهت جلسة الخادم. سجّل الدخول ثم أعد فتح /admin.');
                setPhase('request');
                return;
            }
            if (!result.ok || result.delivered !== true) {
                setError(result.error || 'تعذّر إرسال رمز التحقق إلى البريد الرسمي');
                setPhase('request');
                return;
            }
            const hint = result.destinationHint || 'بريد المدير الرسمي';
            setSentNotice(`تم إرسال رمز التحقق إلى ${hint}. أدخل الرمز هنا للمتابعة.`);
            setOtp('');
            setVerifyNeedsLogin(false);
            setPhase('verify');
        } finally {
            setBusy(false);
        }
    }, []);

    /** رمز جديد تلقائياً فقط عندما الخادم يقول إن الجهاز غير موثّق — ليس عند فشل الفحص */
    useEffect(() => {
        if (phase !== 'request' || autoStartedRef.current || trusted || holdActive) return;
        autoStartedRef.current = true;
        void handleRequestOtp();
    }, [phase, trusted, holdActive, handleRequestOtp]);

    const handleVerifyOtp = useCallback(
        async (event?: FormEvent) => {
            event?.preventDefault();
            setBusy(true);
            setError(null);
            try {
                await completeWithCode(otp);
            } finally {
                setBusy(false);
            }
        },
        [completeWithCode, otp],
    );

    const handleBackToRequest = useCallback(() => {
        autoStartedRef.current = false;
        setPhase('request');
        setOtp('');
        setError(null);
        setSentNotice(null);
        setVerifyNeedsLogin(false);
    }, []);

    if (trusted) {
        return <>{children}</>;
    }

    if (holdActive) {
        return <BlankDocumentLayer />;
    }

    if (phase === 'checking') {
        return (
            <div
                className={cn(authGateShellClass, className)}
                data-testid="require-trusted-device-gate"
                data-phase={phase}
                data-hami-auth-gate=""
                data-hami-hq-gate=""
                role="status"
                aria-busy="true"
                aria-label="توثيق جهاز مقر القيادة"
            >
                <div className={authGatePanelClass}>
                    <div className={authGateCardClass}>
                        <p className={authGateHintClass}>جاري التحقق من الجهاز الموثوق…</p>
                        {error ? (
                            <p role="alert" className={authGateErrorClass}>
                                {error}
                            </p>
                        ) : null}
                        {verifyNeedsLogin ? (
                            <button
                                type="button"
                                className={authGatePrimaryBtnClass}
                                data-testid="admin-otp-session-login"
                                onClick={() => onSessionRequiredRef.current?.()}
                            >
                                تسجيل الدخول
                            </button>
                        ) : error ? (
                            <button
                                type="button"
                                className={authGatePrimaryBtnClass}
                                data-testid="admin-otp-retry-probe"
                                onClick={() => {
                                    autoStartedRef.current = false;
                                    setError(null);
                                    setVerifyNeedsLogin(false);
                                    setPhase('checking');
                                    setProbeEpoch((n) => n + 1);
                                }}
                            >
                                إعادة المحاولة
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(authGateShellClass, className)}
            data-testid="require-trusted-device-gate"
            data-phase={phase}
            data-hami-auth-gate=""
            data-hami-hq-gate=""
            role="main"
            aria-label="تحقق مقر القيادة"
            style={{ pointerEvents: 'auto' }}
        >
            <div className={authGatePanelClass}>
                <div className={authGateCardClass}>
                    <h1 className={authGateTitleClass}>
                        {phase === 'request' ? 'توثيق الجهاز' : 'رمز التحقق'}
                    </h1>
                    <p className={authGateHintClass}>
                        {phase === 'request'
                            ? 'سيُرسل رمز من 6 أرقام إلى بريد المدير الرسمي فقط. لن يُفتح المقر قبل إدخال الرمز.'
                            : 'أدخل الرمز المكوّن من 6 أرقام.'}
                    </p>

                    {phase === 'request' ? (
                        <>
                            {verifyNeedsLogin ? (
                                <button
                                    type="button"
                                    className={authGatePrimaryBtnClass}
                                    data-testid="admin-otp-session-login"
                                    onClick={() => onSessionRequiredRef.current?.()}
                                >
                                    تسجيل الدخول
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => void handleRequestOtp()}
                                    className={authGatePrimaryBtnClass}
                                    data-testid="admin-otp-request"
                                >
                                    {busy ? 'جاري الإرسال…' : 'أرسل رمز التحقق'}
                                </button>
                            )}
                            {error ? (
                                <p role="alert" className={authGateErrorClass}>
                                    {error}
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <form
                            className="flex w-full flex-col gap-3"
                            onSubmit={(e) => void handleVerifyOtp(e)}
                            noValidate
                        >
                            {sentNotice ? (
                                <p role="status" className={authGateHintClass} data-testid="admin-otp-sent">
                                    {sentNotice}
                                </p>
                            ) : null}

                            <label htmlFor={otpFieldId} className={authGateLabelClass}>
                                <span className={authGateLabelTextClass}>رمز التحقق (6 أرقام)</span>
                                <input
                                    id={otpFieldId}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    autoFocus
                                    maxLength={6}
                                    value={otp}
                                    disabled={busy}
                                    onChange={(e) => {
                                        setError(null);
                                        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                                    }}
                                    placeholder="••••••"
                                    className={authGateInputClass}
                                    style={{
                                        textAlign: 'center',
                                        fontFamily: 'ui-monospace, monospace',
                                        letterSpacing: '0.35em',
                                        fontSize: '1.35rem',
                                        minHeight: 56,
                                    }}
                                    dir="ltr"
                                    data-testid="admin-otp-input"
                                />
                            </label>

                            {error ? (
                                <p role="alert" className={authGateErrorClass}>
                                    {error}
                                </p>
                            ) : null}

                            {verifyNeedsLogin ? (
                                <button
                                    type="button"
                                    className={authGatePrimaryBtnClass}
                                    data-testid="admin-otp-session-login"
                                    onClick={() => onSessionRequiredRef.current?.()}
                                >
                                    تسجيل الدخول
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={busy || otp.replace(/\D/g, '').length !== 6}
                                    className={authGatePrimaryBtnClass}
                                    data-testid="admin-otp-verify"
                                >
                                    {busy ? 'جاري التحقق…' : 'تأكيد والدخول'}
                                </button>
                            )}

                            <button
                                type="button"
                                disabled={busy}
                                onClick={handleBackToRequest}
                                className={authGateGhostBtnClass}
                                data-testid="admin-otp-back"
                            >
                                رجوع / إعادة الإرسال
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

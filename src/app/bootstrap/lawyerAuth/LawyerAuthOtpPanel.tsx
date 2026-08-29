import React, { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { AuthPasswordField } from '@/app/bootstrap/lawyerAuth/AuthPasswordField';
import {
    authGateCardClass,
    authGateErrorClass,
    authGateGhostBtnClass,
    authGateHintClass,
    authGateInputClass,
    authGateLabelClass,
    authGateLabelTextClass,
    authGatePrimaryBtnClass,
    authGateSecondaryBtnClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    isAllowedSupportWhatsAppUrl,
    readClientSupportWhatsAppUrl,
} from '@/app/constants/supportWhatsapp';
import { validateHeadquartersAccountPassword } from '@/app/services/admin/hqAccountPassword';
import {
    completeAuthOtp,
    previewAuthOtpAccount,
    requestAuthOtp,
    type AuthOtpAccountPreview,
    type AuthOtpChannel,
    type AuthOtpPurpose,
} from '@/app/services/auth/authOtpClient';
import { validateRecoveryEmailShape } from '@/app/services/auth/registrationCredentialsSecurity';
import { clearEmailConfirmationPending } from '@/app/services/auth/emailConfirmationClient';
import { openNativeScheme } from '@/app/services/profile/profileContactNavigation';

type Step = 'email' | 'channel' | 'verify';

type LawyerAuthOtpPanelProps = {
    purpose: AuthOtpPurpose;
    initialEmail?: string;
    onBack: () => void;
    onCompleted?: () => void;
};

function resolveAdminWhatsAppUrl(preview: AuthOtpAccountPreview | null): string | null {
    const fromPreview = preview?.adminWhatsappUrl?.trim() ?? '';
    const candidate = fromPreview || readClientSupportWhatsAppUrl() || '';
    return candidate && isAllowedSupportWhatsAppUrl(candidate) ? candidate : null;
}

export function LawyerAuthOtpPanel({
    purpose,
    initialEmail = '',
    onBack,
    onCompleted,
}: LawyerAuthOtpPanelProps): ReactElement {
    const isReset = purpose === 'password_reset';
    const [step, setStep] = useState<Step>(isReset ? 'email' : 'channel');
    const [email, setEmail] = useState(initialEmail);
    const [channel, setChannel] = useState<AuthOtpChannel>('email');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const [preview, setPreview] = useState<AuthOtpAccountPreview | null>(null);
    const busyRef = useRef(false);

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const timer = window.setInterval(() => {
            setResendIn((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [resendIn]);

    const loadPreview = async (nextEmail: string): Promise<AuthOtpAccountPreview | null> => {
        const trimmed = nextEmail.trim().toLowerCase();
        const shape = validateRecoveryEmailShape(trimmed);
        if (shape) {
            setError(shape);
            return null;
        }
        const next = await previewAuthOtpAccount({ email: trimmed, purpose });
        setPreview(next);
        return next;
    };

    useEffect(() => {
        if (isReset || !initialEmail.includes('@')) return undefined;
        let cancelled = false;
        void previewAuthOtpAccount({
            email: initialEmail.trim().toLowerCase(),
            purpose,
        })
            .then((next) => {
                if (!cancelled) setPreview(next);
            })
            .catch((e) => {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : 'تعذّر التحقق من البريد');
                }
            });
        return () => {
            cancelled = true;
        };
    }, [isReset, initialEmail, purpose]);

    const phoneTail = preview?.phoneTail ?? null;
    const adminWhatsappUrl = resolveAdminWhatsAppUrl(preview);

    const title = isReset ? 'استعادة كلمة المرور' : 'تأكيد الحساب برمز';
    const hint =
        step === 'email'
            ? 'أدخل بريد الحساب المسجّل. لن نتابع إن كان وهمياً أو غير مسجّل.'
            : step === 'channel'
              ? 'سيُرسل رمز التحقق إلى بريد الحساب المسجّل. واتساب مؤجَّل حتى يكتمل إعداده.'
              : isReset
                ? 'أدخل الرمز وكلمة المرور الجديدة. بعد الحفظ تصبح هي كلمة الدخول الأصلية.'
                : 'أدخل رمز التحقق الذي وصلك.';

    const sendCode = async (nextChannel: AuthOtpChannel, nextEmail = email) => {
        if (busyRef.current || loading) return;
        const trimmed = nextEmail.trim().toLowerCase();
        const shape = validateRecoveryEmailShape(trimmed);
        if (shape) {
            setError(shape);
            return;
        }
        busyRef.current = true;
        setChannel(nextChannel);
        setLoading(true);
        setError('');
        try {
            if (nextChannel === 'whatsapp') {
                let current = preview;
                if (!current) {
                    current = await loadPreview(trimmed);
                    if (!current) return;
                }
                if (!current.hasWhatsAppNumber) {
                    setError(
                        'لا يوجد رقم واتساب مسجّل على هذا الحساب. استخدم البريد أو تواصل مع الإدارة.',
                    );
                    return;
                }
            }
            const result = await requestAuthOtp({
                email: trimmed,
                channel: nextChannel,
                purpose,
            });
            if (result.phoneTail) {
                setPreview((prev) =>
                    prev
                        ? { ...prev, phoneTail: result.phoneTail, hasWhatsAppNumber: true }
                        : prev,
                );
            }
            SmartToast.success(result.message);
            if (result.delivery === 'link') {
                onBack();
                return;
            }
            setResendIn(result.resendAfterSec);
            setStep('verify');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'تعذّر إرسال الرمز');
        } finally {
            busyRef.current = false;
            setLoading(false);
        }
    };

    const continueFromEmail = async () => {
        if (busyRef.current || loading) return;
        const trimmed = email.trim().toLowerCase();
        if (!trimmed.includes('@')) {
            setError('أدخل البريد الإلكتروني');
            return;
        }
        const shape = validateRecoveryEmailShape(trimmed);
        if (shape) {
            setError(shape);
            return;
        }
        busyRef.current = true;
        setLoading(true);
        setError('');
        try {
            setEmail(trimmed);
            const next = await loadPreview(trimmed);
            if (!next) return;
            setStep('channel');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'تعذّر التحقق من البريد');
        } finally {
            busyRef.current = false;
            setLoading(false);
        }
    };

    const openAdminWhatsApp = () => {
        if (!adminWhatsappUrl) {
            setError('رقم واتساب الإدارة غير مضبوط على هذا الجهاز.');
            return;
        }
        openNativeScheme(adminWhatsappUrl);
    };

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        if (busyRef.current || loading) return;
        const digits = code.replace(/\D/g, '');
        if (digits.length < 4) {
            setError('أدخل رمز التحقق كاملاً');
            return;
        }
        if (isReset && password !== confirm) {
            setError('تأكيد كلمة المرور غير متطابق');
            return;
        }
        if (isReset) {
            const policy = validateHeadquartersAccountPassword(password);
            if (policy) {
                setError(policy);
                return;
            }
        }
        busyRef.current = true;
        setLoading(true);
        setError('');
        try {
            const message = await completeAuthOtp({
                email: email.trim().toLowerCase(),
                code: digits,
                purpose,
                newPassword: isReset ? password : undefined,
            });
            if (!isReset) clearEmailConfirmationPending();
            SmartToast.success(message);
            onCompleted?.();
            onBack();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'تعذّر إكمال التحقق');
        } finally {
            busyRef.current = false;
            setLoading(false);
        }
    };

    return (
        <div className={authGateCardClass} data-testid="lawyer-auth-otp-panel" aria-label={title}>
            <h1 className={authGateTitleClass}>{title}</h1>
            <p className={authGateHintClass}>{hint}</p>

            {step === 'email' ? (
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void continueFromEmail();
                    }}
                    noValidate
                    data-testid="lawyer-auth-otp-email-form"
                >
                    <label className={authGateLabelClass}>
                        <span className={authGateLabelTextClass}>البريد الإلكتروني</span>
                        <input
                            type="email"
                            inputMode="email"
                            autoComplete="username"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            dir="ltr"
                            lang="en"
                            autoFocus
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className={authGateInputClass}
                            style={{ textAlign: 'left' }}
                            data-testid="lawyer-auth-otp-email"
                        />
                    </label>
                    {error ? (
                        <p className={authGateErrorClass} role="alert" data-testid="lawyer-auth-otp-error">
                            {error}
                        </p>
                    ) : null}
                    <button
                        type="submit"
                        className={authGatePrimaryBtnClass}
                        disabled={loading}
                        data-testid="lawyer-auth-otp-email-continue"
                    >
                        {loading ? 'جاري التحقق…' : 'متابعة'}
                    </button>
                    <button
                        type="button"
                        className={authGateGhostBtnClass}
                        onClick={onBack}
                        data-testid="lawyer-auth-otp-back"
                    >
                        رجوع
                    </button>
                </form>
            ) : step === 'channel' ? (
                <>
                    {isReset ? null : (
                        <label className={authGateLabelClass}>
                            <span className={authGateLabelTextClass}>البريد الإلكتروني</span>
                            <input
                                type="email"
                                inputMode="email"
                                autoComplete="username"
                                autoCapitalize="off"
                                dir="ltr"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className={authGateInputClass}
                                style={{ textAlign: 'left' }}
                                data-testid="lawyer-auth-otp-email"
                            />
                        </label>
                    )}
                    {error ? (
                        <p className={authGateErrorClass} role="alert" data-testid="lawyer-auth-otp-error">
                            {error}
                        </p>
                    ) : null}
                    <button
                        type="button"
                        className={authGatePrimaryBtnClass}
                        disabled={loading}
                        onClick={() => void sendCode('email')}
                        data-testid="lawyer-auth-otp-channel-email"
                    >
                        {loading && channel === 'email' ? 'جاري الإرسال…' : 'إرسال الرمز إلى البريد'}
                    </button>
                    {preview?.whatsappSendReady === true ? (
                        <button
                            type="button"
                            className={authGateSecondaryBtnClass}
                            disabled={loading}
                            onClick={() => void sendCode('whatsapp')}
                            data-testid="lawyer-auth-otp-channel-whatsapp"
                        >
                            {loading && channel === 'whatsapp' ? 'جاري الإرسال…' : 'واتساب'}
                        </button>
                    ) : null}
                    {adminWhatsappUrl ? (
                        <button
                            type="button"
                            className={authGateGhostBtnClass}
                            disabled={loading}
                            onClick={openAdminWhatsApp}
                            data-testid="lawyer-auth-otp-channel-admin-whatsapp"
                        >
                            التواصل مع الإدارة عبر واتساب
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className={authGateGhostBtnClass}
                        disabled={loading}
                        onClick={() => {
                            if (isReset) {
                                setError('');
                                setStep('email');
                                return;
                            }
                            onBack();
                        }}
                        data-testid="lawyer-auth-otp-back"
                    >
                        رجوع
                    </button>
                </>
            ) : (
                <form onSubmit={(event) => void onSubmit(event)}>
                    <p className={authGateHintClass} data-testid="lawyer-auth-otp-delivery-hint">
                        {channel === 'whatsapp'
                            ? phoneTail
                                ? `ستصل الرسالة إلى الرقم الذي ينتهي بـ ${phoneTail}.`
                                : 'سيصل الرمز إلى واتساب المسجّل على الحساب.'
                            : 'سيصل الرمز إلى بريد الحساب المسجّل.'}{' '}
                        إن لم يصلك، انتظر العدّ ثم اطلبه مجدداً.
                    </p>
                    <label className={authGateLabelClass}>
                        <span className={authGateLabelTextClass}>رمز التحقق</span>
                        <input
                            type="text"
                            name="one-time-code"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="done"
                            autoFocus
                            pattern="[0-9]*"
                            maxLength={8}
                            dir="ltr"
                            value={code}
                            onChange={(event) => setCode(event.target.value.replace(/[^\d]/g, ''))}
                            className={authGateInputClass}
                            style={{ textAlign: 'center', letterSpacing: '0.35em' }}
                            data-testid="lawyer-auth-otp-code"
                            aria-label="رمز التحقق"
                        />
                    </label>
                    {isReset ? (
                        <>
                            <AuthPasswordField
                                label="كلمة المرور الجديدة"
                                testId="lawyer-auth-otp-new-password"
                                autoComplete="new-password"
                                required
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                            />
                            <AuthPasswordField
                                label="تأكيد كلمة المرور"
                                testId="lawyer-auth-otp-confirm-password"
                                autoComplete="new-password"
                                required
                                value={confirm}
                                onChange={(event) => setConfirm(event.target.value)}
                            />
                        </>
                    ) : null}
                    {error ? (
                        <p className={authGateErrorClass} role="alert" data-testid="lawyer-auth-otp-error">
                            {error}
                        </p>
                    ) : null}
                    <button
                        type="submit"
                        className={authGatePrimaryBtnClass}
                        disabled={loading}
                        data-testid="lawyer-auth-otp-submit"
                    >
                        {loading ? 'جاري التحقق…' : isReset ? 'حفظ كلمة المرور' : 'تأكيد الرمز'}
                    </button>
                    <button
                        type="button"
                        className={authGateGhostBtnClass}
                        disabled={loading || resendIn > 0}
                        onClick={() => void sendCode(channel)}
                        data-testid="lawyer-auth-otp-resend"
                    >
                        {resendIn > 0 ? `طلب رمز جديد بعد ${resendIn}ث` : 'لم يصلك الرمز؟ إعادة الإرسال'}
                    </button>
                    <button
                        type="button"
                        className={authGateGhostBtnClass}
                        disabled={loading}
                        onClick={() => {
                            setStep('channel');
                            setError('');
                        }}
                        data-testid="lawyer-auth-otp-change-channel"
                    >
                        تغيير القناة
                    </button>
                </form>
            )}
        </div>
    );
}

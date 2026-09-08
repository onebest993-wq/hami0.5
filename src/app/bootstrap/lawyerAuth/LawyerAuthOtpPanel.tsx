import React, { useEffect, useRef, useState, type FormEvent, type ReactElement } from 'react';
import {
    authGateCardClass,
    authGateHintClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';
import {
    OtpChannelStep,
    OtpEmailStep,
    OtpVerifyStep,
} from '@/app/bootstrap/lawyerAuth/LawyerAuthOtpPanelSteps';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useVisibilityAwareInterval } from '@/app/hooks/useVisibilityAwareInterval';
import {
    isAllowedSupportWhatsAppUrl,
    readClientSupportWhatsAppUrl,
} from '@/app/constants/supportWhatsapp';
import { validateHeadquartersAccountPassword } from '@/app/services/admin/hqAccountPassword';
import {
    AUTH_OTP_CODE_LENGTH,
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
    const resendDeadlineRef = useRef(0);

    useVisibilityAwareInterval(() => {
        const left = Math.max(0, Math.ceil((resendDeadlineRef.current - Date.now()) / 1000));
        setResendIn(left);
    }, 1000, resendIn > 0);

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
            /* الذيل يأتي من الإرسال الفعلي فقط، فلا يُفقد حتى لو لم تُحمَّل المعاينة. */
            if (result.phoneTail) {
                setPreview((prev) => ({
                    emailReady: prev?.emailReady ?? true,
                    whatsappSendReady: prev?.whatsappSendReady ?? false,
                    adminWhatsappUrl: prev?.adminWhatsappUrl ?? null,
                    phoneTail: result.phoneTail,
                    hasWhatsAppNumber: true,
                }));
            }
            SmartToast.success(result.message);
            if (result.delivery === 'link') {
                onBack();
                return;
            }
            setResendIn(result.resendAfterSec);
            resendDeadlineRef.current = Date.now() + Math.max(0, result.resendAfterSec) * 1000;
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
        if (digits.length !== AUTH_OTP_CODE_LENGTH) {
            setError(`أدخل رمز التحقق كاملاً (${AUTH_OTP_CODE_LENGTH} أرقام)`);
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
        <section className={authGateCardClass} data-testid="lawyer-auth-otp-panel" aria-label={title}>
            <h1 className={authGateTitleClass}>{title}</h1>
            <p className={authGateHintClass}>{hint}</p>

            {step === 'email' ? (
                <OtpEmailStep
                    email={email}
                    error={error}
                    loading={loading}
                    onEmailChange={setEmail}
                    onContinue={() => void continueFromEmail()}
                    onBack={onBack}
                />
            ) : step === 'channel' ? (
                <OtpChannelStep
                    email={email}
                    error={error}
                    loading={loading}
                    channel={channel}
                    showEmailField={!isReset}
                    showWhatsAppChannel={preview?.whatsappSendReady === true}
                    adminWhatsappUrl={adminWhatsappUrl}
                    onEmailChange={setEmail}
                    onSendEmail={() => void sendCode('email')}
                    onSendWhatsApp={() => void sendCode('whatsapp')}
                    onOpenAdminWhatsApp={openAdminWhatsApp}
                    onBack={() => {
                        if (isReset) {
                            setError('');
                            setStep('email');
                            return;
                        }
                        onBack();
                    }}
                />
            ) : (
                <OtpVerifyStep
                    isReset={isReset}
                    channel={channel}
                    phoneTail={phoneTail}
                    code={code}
                    password={password}
                    confirm={confirm}
                    error={error}
                    loading={loading}
                    resendIn={resendIn}
                    onCodeChange={setCode}
                    onPasswordChange={setPassword}
                    onConfirmChange={setConfirm}
                    onSubmit={(event) => void onSubmit(event)}
                    onResend={() => void sendCode(channel)}
                    onChangeChannel={() => {
                        setStep('channel');
                        setError('');
                    }}
                />
            )}
        </section>
    );
}

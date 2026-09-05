/**
 * خطوات لوحة رمز التحقق — عرض فقط. المنطق والحالة في `LawyerAuthOtpPanel`.
 * الفئات ومعرّفات الاختبار مطابقة حرفياً حتى لا يتغيّر الشكل ولا تنكسر العقود.
 */
import React, { type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { AuthPasswordField } from '@/app/bootstrap/lawyerAuth/AuthPasswordField';
import {
    authGateErrorClass,
    authGateGhostBtnClass,
    authGateHintClass,
    authGateInputClass,
    authGateLabelClass,
    authGateLabelTextClass,
    authGatePrimaryBtnClass,
    authGateSecondaryBtnClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';
import { AUTH_OTP_CODE_LENGTH, type AuthOtpChannel } from '@/app/services/auth/authOtpClient';

function OtpError({ error }: { error: string }): ReactElement | null {
    if (!error) return null;
    return (
        <p className={authGateErrorClass} role="alert" data-testid="lawyer-auth-otp-error">
            {error}
        </p>
    );
}

function OtpEmailInput({
    value,
    onChange,
    focus,
}: {
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    focus?: boolean;
}): ReactElement {
    return (
        <label className={authGateLabelClass}>
            <span className={authGateLabelTextClass}>البريد الإلكتروني</span>
            <input
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect={focus ? 'off' : undefined}
                spellCheck={focus ? false : undefined}
                dir="ltr"
                lang={focus ? 'en' : undefined}
                autoFocus={focus}
                value={value}
                onChange={onChange}
                className={authGateInputClass}
                style={{ textAlign: 'left' }}
                data-testid="lawyer-auth-otp-email"
            />
        </label>
    );
}

export function OtpEmailStep({
    email,
    error,
    loading,
    onEmailChange,
    onContinue,
    onBack,
}: {
    email: string;
    error: string;
    loading: boolean;
    onEmailChange: (next: string) => void;
    onContinue: () => void;
    onBack: () => void;
}): ReactElement {
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                onContinue();
            }}
            noValidate
            data-testid="lawyer-auth-otp-email-form"
        >
            <OtpEmailInput
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                focus
            />
            <OtpError error={error} />
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
    );
}

export function OtpChannelStep({
    email,
    error,
    loading,
    channel,
    showEmailField,
    showWhatsAppChannel,
    adminWhatsappUrl,
    onEmailChange,
    onSendEmail,
    onSendWhatsApp,
    onOpenAdminWhatsApp,
    onBack,
}: {
    email: string;
    error: string;
    loading: boolean;
    channel: AuthOtpChannel;
    showEmailField: boolean;
    showWhatsAppChannel: boolean;
    adminWhatsappUrl: string | null;
    onEmailChange: (next: string) => void;
    onSendEmail: () => void;
    onSendWhatsApp: () => void;
    onOpenAdminWhatsApp: () => void;
    onBack: () => void;
}): ReactElement {
    return (
        <>
            {showEmailField ? (
                <OtpEmailInput value={email} onChange={(event) => onEmailChange(event.target.value)} />
            ) : null}
            <OtpError error={error} />
            <button
                type="button"
                className={authGatePrimaryBtnClass}
                disabled={loading}
                onClick={onSendEmail}
                data-testid="lawyer-auth-otp-channel-email"
            >
                {loading && channel === 'email' ? 'جاري الإرسال…' : 'إرسال الرمز إلى البريد'}
            </button>
            {showWhatsAppChannel ? (
                <button
                    type="button"
                    className={authGateSecondaryBtnClass}
                    disabled={loading}
                    onClick={onSendWhatsApp}
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
                    onClick={onOpenAdminWhatsApp}
                    data-testid="lawyer-auth-otp-channel-admin-whatsapp"
                >
                    التواصل مع الإدارة عبر واتساب
                </button>
            ) : null}
            <button
                type="button"
                className={authGateGhostBtnClass}
                disabled={loading}
                onClick={onBack}
                data-testid="lawyer-auth-otp-back"
            >
                رجوع
            </button>
        </>
    );
}

function deliveryHint(channel: AuthOtpChannel, phoneTail: string | null): string {
    if (channel !== 'whatsapp') return 'سيصل الرمز إلى بريد الحساب المسجّل.';
    return phoneTail
        ? `ستصل الرسالة إلى الرقم الذي ينتهي بـ ${phoneTail}.`
        : 'سيصل الرمز إلى واتساب المسجّل على الحساب.';
}

export function OtpVerifyStep({
    isReset,
    channel,
    phoneTail,
    code,
    password,
    confirm,
    error,
    loading,
    resendIn,
    onCodeChange,
    onPasswordChange,
    onConfirmChange,
    onSubmit,
    onResend,
    onChangeChannel,
}: {
    isReset: boolean;
    channel: AuthOtpChannel;
    phoneTail: string | null;
    code: string;
    password: string;
    confirm: string;
    error: string;
    loading: boolean;
    resendIn: number;
    onCodeChange: (next: string) => void;
    onPasswordChange: (next: string) => void;
    onConfirmChange: (next: string) => void;
    onSubmit: (event: FormEvent) => void;
    onResend: () => void;
    onChangeChannel: () => void;
}): ReactElement {
    return (
        <form onSubmit={onSubmit}>
            <p className={authGateHintClass} data-testid="lawyer-auth-otp-delivery-hint">
                {deliveryHint(channel, phoneTail)} إن لم يصلك، انتظر العدّ ثم اطلبه مجدداً.
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
                    maxLength={AUTH_OTP_CODE_LENGTH}
                    dir="ltr"
                    value={code}
                    onChange={(event) =>
                        onCodeChange(
                            event.target.value.replace(/[^\d]/g, '').slice(0, AUTH_OTP_CODE_LENGTH),
                        )
                    }
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
                        onChange={(event) => onPasswordChange(event.target.value)}
                    />
                    <AuthPasswordField
                        label="تأكيد كلمة المرور"
                        testId="lawyer-auth-otp-confirm-password"
                        autoComplete="new-password"
                        required
                        value={confirm}
                        onChange={(event) => onConfirmChange(event.target.value)}
                    />
                </>
            ) : null}
            <OtpError error={error} />
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
                onClick={onResend}
                data-testid="lawyer-auth-otp-resend"
            >
                {resendIn > 0 ? `طلب رمز جديد بعد ${resendIn}ث` : 'لم يصلك الرمز؟ إعادة الإرسال'}
            </button>
            <button
                type="button"
                className={authGateGhostBtnClass}
                disabled={loading}
                onClick={onChangeChannel}
                data-testid="lawyer-auth-otp-change-channel"
            >
                تغيير القناة
            </button>
        </form>
    );
}

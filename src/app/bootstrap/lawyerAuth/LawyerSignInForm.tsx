import React, { useRef, useState, type FormEvent, type ReactElement } from 'react';
import { LawyerAuthOtpPanel } from '@/app/bootstrap/lawyerAuth/LawyerAuthOtpPanel';
import { useAuth } from '@/app/context/authHooks';
import { isEmailConfirmationErrorMessage } from '@/app/services/auth/emailConfirmationClient';
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { SmartToast } from '@/app/components/ui/SmartToast';
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
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';

type Props = {
    onBack: () => void;
    /** بعد جلسة ناجحة — مقر القيادة يعيد التحقق حتى لو لم يتغيّر معرّف الحساب */
    onSuccess?: () => void;
    /** عنوان اختياري — `null` يخفيه، والغياب يستخدم عنوان الدخول العادي */
    title?: string | null;
    /** تلميح اختياري تحت العنوان — `null` يخفيه */
    hint?: string | null;
    /** تلميح ترميز كلمة المرور — يُخفى في بوابة المقر */
    showCharsetHint?: boolean;
};

function readSignInCredentials(form: HTMLFormElement): { email: string; password: string } {
    const data = new FormData(form);
    return {
        email: String(data.get('email') ?? '').trim().toLowerCase(),
        password: String(data.get('password') ?? ''),
    };
}

export function LawyerSignInForm({
    onBack,
    onSuccess,
    title,
    hint,
    showCharsetHint = true,
}: Props): ReactElement {
    const { login, resendEmailConfirmation } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [otpPurpose, setOtpPurpose] = useState<'password_reset' | 'email_confirm' | null>(null);
    const submittingRef = useRef(false);
    const resendSubmittingRef = useRef(false);
    const resolvedTitle = title === null ? null : (title ?? 'تسجيل الدخول');
    const resolvedHint =
        hint === null
            ? null
            : (hint ??
              (isBffAuthEnabled()
                  ? 'جلسة آمنة عبر الخادم — يلزم حساب محامٍ مسجّل.'
                  : 'أدخل بيانات حساب Supabase للمحامي.'));

    const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (submittingRef.current || loading) return;
        const next = readSignInCredentials(event.currentTarget);
        setEmail(next.email);
        setPassword(next.password);
        if (!next.email.includes('@') || !next.password) {
            setError('أدخل البريد الإلكتروني وكلمة المرور');
            return;
        }
        submittingRef.current = true;
        setError('');
        setLoading(true);
        try {
            await login(next.email, next.password);
            onSuccess?.();
        } catch (e) {
            const { humanizeAuthError } = await import('@/app/services/auth/humanizeAuthError');
            const msg = humanizeAuthError(e, 'فشل تسجيل الدخول', 'login');
            setError(msg);
            const { isEmailConfirmationErrorMessage, markEmailConfirmationPending } = await import(
                '@/app/services/auth/emailConfirmationClient'
            );
            if (isEmailConfirmationErrorMessage(msg)) {
                markEmailConfirmationPending(next.email);
            }
        } finally {
            submittingRef.current = false;
            setLoading(false);
        }
    };

    const onForgot = () => {
        setError('');
        setOtpPurpose('password_reset');
    };

    const showResendConfirm = isEmailConfirmationErrorMessage(error);

    const onResendConfirm = async () => {
        if (resendSubmittingRef.current || resendLoading || submittingRef.current) return;
        const trimmed = email.trim().toLowerCase();
        if (!trimmed.includes('@')) {
            setError('أدخل بريدك الإلكتروني أولاً ثم اضغط «إعادة إرسال التأكيد»');
            return;
        }
        resendSubmittingRef.current = true;
        setResendLoading(true);
        try {
            const message = await resendEmailConfirmation(trimmed);
            SmartToast.success(message);
        } catch (e) {
            const { humanizeAuthError } = await import('@/app/services/auth/humanizeAuthError');
            setError(humanizeAuthError(e, 'تعذّر إعادة الإرسال', 'login'));
        } finally {
            resendSubmittingRef.current = false;
            setResendLoading(false);
        }
    };

    if (otpPurpose) {
        return (
            <LawyerAuthOtpPanel
                purpose={otpPurpose}
                initialEmail={email}
                onBack={() => setOtpPurpose(null)}
                onCompleted={() => setPassword('')}
            />
        );
    }

    return (
        <form
            onSubmit={(event) => void onSubmit(event)}
            noValidate
            className={authGateCardClass}
            data-testid="lawyer-sign-in-form"
            aria-label="تسجيل الدخول"
        >
            {resolvedTitle ? <h1 className={authGateTitleClass}>{resolvedTitle}</h1> : null}
            {resolvedHint ? <p className={authGateHintClass}>{resolvedHint}</p> : null}
            <label className={authGateLabelClass}>
                <span className={authGateLabelTextClass}>البريد الإلكتروني</span>
                <input
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    name="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    dir="ltr"
                    lang="en"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={authGateInputClass}
                    style={{ textAlign: 'left' }}
                    data-testid="lawyer-sign-in-email"
                />
            </label>
            <AuthPasswordField
                label="كلمة المرور"
                testId="lawyer-sign-in-password"
                autoComplete="current-password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            {showCharsetHint ? (
                <p className={authGateHintClass} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                    يُسمح بالأحرف الإنجليزية الصغيرة والكبيرة والأرقام والرموز كما هي — بدون تحويل تلقائي.
                </p>
            ) : null}
            {error ? (
                <p className={authGateErrorClass} role="alert" data-testid="lawyer-sign-in-error">
                    {error}
                </p>
            ) : null}
            <button
                type="submit"
                disabled={loading || resendLoading}
                className={authGatePrimaryBtnClass}
                data-testid="lawyer-sign-in-submit"
            >
                {loading ? 'جاري الدخول…' : 'دخول'}
            </button>
            <button
                type="button"
                className={authGateGhostBtnClass}
                disabled={loading || resendLoading}
                onClick={onForgot}
                data-testid="lawyer-sign-in-forgot"
            >
                نسيت كلمة المرور؟
            </button>
            {showResendConfirm ? (
                <>
                    <button
                        type="button"
                        className={authGateGhostBtnClass}
                        disabled={loading || resendLoading || !email.trim()}
                        onClick={() => setOtpPurpose('email_confirm')}
                        data-testid="lawyer-sign-in-confirm-otp"
                    >
                        تأكيد برمز (بريد أو واتساب)
                    </button>
                    <button
                        type="button"
                        className={authGateGhostBtnClass}
                        disabled={resendLoading || loading || !email.trim()}
                        onClick={() => void onResendConfirm()}
                        data-testid="lawyer-sign-in-resend-confirm"
                    >
                        {resendLoading ? 'جاري الإرسال…' : 'إعادة إرسال رابط التأكيد'}
                    </button>
                </>
            ) : null}
            <button type="button" className={authGateGhostBtnClass} onClick={onBack} data-testid="lawyer-sign-in-back">
                رجوع
            </button>
        </form>
    );
}

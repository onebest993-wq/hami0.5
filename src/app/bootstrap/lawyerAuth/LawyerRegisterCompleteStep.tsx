import type { ReactElement } from 'react';
import {
    authGateCardClass,
    authGateErrorClass,
    authGateGhostBtnClass,
    authGatePrimaryBtnClass,
    authGateSecondaryBtnClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';

type LawyerRegisterCompleteStepProps = {
    hqReceived?: boolean;
    emailConfirmRequired: boolean;
    loading: boolean;
    resendLoading: boolean;
    retryHqLoading?: boolean;
    error: string;
    enterLoading?: boolean;
    onRetryHqSubmit?: () => void;
    onResendConfirm: () => void;
    onConfirmOtp?: () => void;
    onEnterWithoutWaiting: () => void;
    onGoLogin?: () => void;
};

export function LawyerRegisterCompleteStep({
    hqReceived = true,
    emailConfirmRequired,
    loading,
    resendLoading,
    retryHqLoading = false,
    error,
    enterLoading = false,
    onRetryHqSubmit,
    onResendConfirm,
    onConfirmOtp,
    onEnterWithoutWaiting,
    onGoLogin,
}: LawyerRegisterCompleteStepProps): ReactElement {
    const busy = loading || resendLoading || enterLoading || retryHqLoading;
    return (
        <div className={authGateCardClass} data-testid="lawyer-register-complete">
            <h1 className={authGateTitleClass}>
                {hqReceived ? 'طلبك وصل إلى الإدارة' : 'الحساب أُنشئ — الطلب لم يصل للإدارة'}
            </h1>
            <p className="text-sm text-white/70 leading-relaxed">
                {hqReceived
                    ? 'استلمنا بياناتك وصور هوية النقابة. التدقيق يدوي — يمكنك العمل الآن على هذا الجهاز دون انتظار، وتُفتح المزامنة والمنتدى بعد اعتماد الإدارة.'
                    : 'بياناتك محفوظة على هذا الجهاز. اضغط «إعادة إرسال الطلب للإدارة» بعد استقرار الشبكة. المنتدى يبقى مغلقاً حتى يصل الطلب ويُعتمد.'}
            </p>
            {emailConfirmRequired ? (
                <p className="text-sm text-white/70 leading-relaxed">
                    إن وصلك رابط تأكيد البريد فافتحه لإثبات الصندوق فقط — لا يفعّل صفة المحامي وحده.
                </p>
            ) : null}
            {error ? (
                <p className={authGateErrorClass} role="alert" data-testid="lawyer-register-error">
                    {error}
                </p>
            ) : null}
            {!hqReceived && onRetryHqSubmit ? (
                <button
                    type="button"
                    className={authGatePrimaryBtnClass}
                    disabled={busy}
                    onClick={onRetryHqSubmit}
                    data-testid="lawyer-register-retry-hq"
                >
                    {retryHqLoading ? 'جاري الإرسال…' : 'إعادة إرسال الطلب للإدارة'}
                </button>
            ) : null}
            {emailConfirmRequired ? (
                <>
                    {onConfirmOtp ? (
                        <button
                            type="button"
                            className={authGateSecondaryBtnClass}
                            disabled={busy}
                            onClick={onConfirmOtp}
                            data-testid="lawyer-register-confirm-otp"
                        >
                            تأكيد برمز (بريد أو واتساب)
                        </button>
                    ) : null}
                    <button
                        type="button"
                        className={authGateSecondaryBtnClass}
                        disabled={busy}
                        onClick={onResendConfirm}
                        data-testid="lawyer-register-resend-confirm"
                    >
                        {resendLoading ? 'جاري الإرسال…' : 'إعادة إرسال رابط التأكيد'}
                    </button>
                </>
            ) : null}
            <button
                type="button"
                className={hqReceived ? authGatePrimaryBtnClass : authGateSecondaryBtnClass}
                onClick={onEnterWithoutWaiting}
                disabled={busy}
                data-testid="lawyer-register-enter-pending"
            >
                {enterLoading ? 'جاري الفتح…' : 'الدخول دون انتظار التدقيق'}
            </button>
            {onGoLogin ? (
                <button
                    type="button"
                    className={authGateGhostBtnClass}
                    onClick={onGoLogin}
                    disabled={busy}
                    data-testid="lawyer-register-complete-login"
                >
                    تسجيل الدخول بحساب آخر
                </button>
            ) : null}
        </div>
    );
}

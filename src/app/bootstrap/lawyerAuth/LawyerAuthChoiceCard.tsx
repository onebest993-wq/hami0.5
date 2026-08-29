import { useState, type ReactElement } from 'react';
import {
    authGateCardClass,
    authGateErrorClass,
    authGateGhostBtnClass,
    authGateHintClass,
    authGatePrimaryBtnClass,
    authGateSecondaryBtnClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';

type LawyerAuthChoiceCardProps = {
    guestLoading: boolean;
    guestError: string;
    devLoading: boolean;
    onLogin: () => void;
    onRegister: () => void;
    onGuest: () => void;
    onDevUnlock: () => void;
    onPrefetchForms: () => void;
};

export function LawyerAuthChoiceCard({
    guestLoading,
    guestError,
    devLoading,
    onLogin,
    onRegister,
    onGuest,
    onDevUnlock,
    onPrefetchForms,
}: LawyerAuthChoiceCardProps): ReactElement {
    const busy = guestLoading || devLoading;
    const showDevUnlock = import.meta.env.DEV === true;
    const [guestWarning, setGuestWarning] = useState(false);

    if (guestWarning) {
        return (
            <div className={authGateCardClass} data-testid="lawyer-auth-choice">
                <h1 className={authGateTitleClass}>الدخول بدون تسجيل</h1>
                <div data-testid="lawyer-auth-guest-warning">
                    <p className={authGateHintClass}>
                        ستفقد المنتدى والمزامنة بين الأجهزة والسحابة والاعتماد النقابي وطلب التدقيق
                        الإداري. عملك يبقى على هذا الجهاز فقط ويُفقد إن مُسحت بياناته.
                    </p>
                    <button
                        type="button"
                        className={authGateSecondaryBtnClass}
                        disabled={busy}
                        onClick={onGuest}
                        data-testid="lawyer-auth-guest-confirm"
                    >
                        {guestLoading ? 'جاري الفتح…' : 'أفهم — المتابعة محلياً'}
                    </button>
                    <button
                        type="button"
                        className={authGateGhostBtnClass}
                        disabled={busy}
                        onClick={() => setGuestWarning(false)}
                        data-testid="lawyer-auth-guest-cancel"
                    >
                        رجوع
                    </button>
                </div>
                {guestError ? (
                    <p className={authGateErrorClass} role="alert">
                        {guestError}
                    </p>
                ) : null}
            </div>
        );
    }

    return (
        <div className={authGateCardClass} data-testid="lawyer-auth-choice">
            <h1 className={authGateTitleClass}>أهلاً بك</h1>
            <p className={authGateHintClass}>حساب معتمد يفتح المنتدى والمزامنة.</p>
            <button
                type="button"
                className={authGatePrimaryBtnClass}
                onClick={onLogin}
                onPointerEnter={onPrefetchForms}
                onFocus={onPrefetchForms}
                data-testid="lawyer-auth-go-login"
            >
                تسجيل الدخول
            </button>
            <button
                type="button"
                className={authGateSecondaryBtnClass}
                onClick={onRegister}
                onPointerEnter={onPrefetchForms}
                onFocus={onPrefetchForms}
                data-testid="lawyer-auth-go-register"
            >
                إنشاء حساب محامٍ
            </button>
            <p className="hami-auth-gate-divider" role="separator">
                أو
            </p>
            <button
                type="button"
                className={authGateGhostBtnClass}
                disabled={busy}
                onClick={() => setGuestWarning(true)}
                data-testid="lawyer-auth-enter-guest"
            >
                الدخول بدون تسجيل
            </button>
            {showDevUnlock ? (
                <button
                    type="button"
                    className={authGateGhostBtnClass}
                    disabled={busy}
                    onClick={onDevUnlock}
                    data-testid="lawyer-auth-enter-dev"
                >
                    {devLoading ? 'جاري الفتح…' : 'الدخول كمطور'}
                </button>
            ) : null}
            {guestError ? (
                <p className={authGateErrorClass} role="alert">
                    {guestError}
                </p>
            ) : null}
        </div>
    );
}

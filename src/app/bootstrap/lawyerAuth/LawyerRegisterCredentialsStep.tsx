import type { FormEvent, ReactElement } from 'react';
import { AuthPasswordField } from '@/app/bootstrap/lawyerAuth/AuthPasswordField';
import {
    authGateCardClass,
    authGateErrorClass,
    authGateGhostBtnClass,
    authGateInputClass,
    authGateLabelClass,
    authGateLabelTextClass,
    authGatePrimaryBtnClass,
    authGateTitleClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';

type LawyerRegisterCredentialsStepProps = {
    title: string;
    email: string;
    password: string;
    confirmPassword: string;
    loading: boolean;
    error: string;
    onEmail: (value: string) => void;
    onPassword: (value: string) => void;
    onConfirmPassword: (value: string) => void;
    onSubmit: (event: FormEvent) => void;
    onBack: () => void;
};

export function LawyerRegisterCredentialsStep({
    title,
    email,
    password,
    confirmPassword,
    loading,
    error,
    onEmail,
    onPassword,
    onConfirmPassword,
    onSubmit,
    onBack,
}: LawyerRegisterCredentialsStepProps): ReactElement {
    return (
        <form
            onSubmit={onSubmit}
            className={authGateCardClass}
            data-testid="lawyer-register-credentials"
        >
            <h1 className={authGateTitleClass}>{title}</h1>
            <label className={authGateLabelClass}>
                <span className={authGateLabelTextClass}>البريد الإلكتروني</span>
                <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    dir="ltr"
                    lang="en"
                    required
                    value={email}
                    onChange={(e) => onEmail(e.target.value.replace(/\s/g, '').slice(0, 254))}
                    className={authGateInputClass}
                    style={{ textAlign: 'left' }}
                    maxLength={254}
                    data-testid="lawyer-register-email"
                />
            </label>
            <AuthPasswordField
                label="كلمة المرور"
                testId="lawyer-register-password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => onPassword(e.target.value)}
            />
            <AuthPasswordField
                label="تأكيد كلمة المرور"
                testId="lawyer-register-password-confirm"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => onConfirmPassword(e.target.value)}
            />
            {error ? (
                <p className={authGateErrorClass} role="alert" data-testid="lawyer-register-error">
                    {error}
                </p>
            ) : null}
            <button
                type="submit"
                disabled={loading}
                className={authGatePrimaryBtnClass}
                data-testid="lawyer-register-credentials-next"
            >
                متابعة
            </button>
            <button type="button" className={authGateGhostBtnClass} onClick={onBack} disabled={loading}>
                رجوع
            </button>
        </form>
    );
}

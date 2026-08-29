import React, { useState, type InputHTMLAttributes, type ReactElement } from 'react';
import { BootEyeIcon, BootEyeOffIcon } from '@/app/components/lawyer/bootStemIcons';
import {
    authGateInputClass,
    authGateLabelClass,
    authGateLabelTextClass,
} from '@/app/bootstrap/lawyerAuth/authGateStyles';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    label: string;
    testId?: string;
};

/**
 * حقل كلمة مرور مستقر: إظهار/إخفاء + LTR للأحرف الإنجليزية
 * الحاوية dir=ltr حتى لا يصطدم زر العين بنص كلمة المرور في واجهة RTL.
 */
export function AuthPasswordField({
    label,
    testId,
    className,
    id,
    ...rest
}: Props): ReactElement {
    const [visible, setVisible] = useState(false);
    const inputId = id ?? testId ?? 'auth-password';

    return (
        <label className={authGateLabelClass} htmlFor={inputId}>
            <span className={authGateLabelTextClass}>{label}</span>
            <div className="relative" dir="ltr">
                <input
                    {...rest}
                    id={inputId}
                    type={visible ? 'text' : 'password'}
                    dir="ltr"
                    lang="en"
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoComplete={rest.autoComplete ?? 'current-password'}
                    spellCheck={false}
                    inputMode="text"
                    className={`${authGateInputClass} hami-auth-gate-input--password text-left font-mono tracking-normal ${className ?? ''}`}
                    data-testid={testId}
                />
                <button
                    type="button"
                    className="absolute inset-y-0 end-0 z-[1] flex min-w-[44px] min-h-[44px] items-center justify-center px-2 text-white/70 hover:text-[#E6C673]"
                    aria-label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    aria-pressed={visible}
                    data-testid={testId ? `${testId}-toggle` : 'auth-password-toggle'}
                    onClick={() => setVisible((v) => !v)}
                    tabIndex={0}
                >
                    {visible ? (
                        <BootEyeOffIcon className="h-5 w-5" aria-hidden />
                    ) : (
                        <BootEyeIcon className="h-5 w-5" aria-hidden />
                    )}
                </button>
            </div>
        </label>
    );
}

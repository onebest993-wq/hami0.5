import '@/app/bootstrap/lawyerAuth/authGateSurface.css';
import React, { useState, type ReactElement } from 'react';
import { LawyerRegisterCompleteStep } from '@/app/bootstrap/lawyerAuth/LawyerRegisterCompleteStep';
import { useAuth } from '@/app/context/authHooks';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    clearRegistrationReviewHold,
    markRegistrationReviewHold,
    readRegistrationReviewHold,
} from '@/app/services/auth/registrationReviewHold';

export function LawyerRegistrationReviewHold(): ReactElement {
    const { user, enterLocalGuest, resendEmailConfirmation } = useAuth();
    const hold = readRegistrationReviewHold();
    const [error, setError] = useState('');
    const [resendLoading, setResendLoading] = useState(false);
    const [enterLoading, setEnterLoading] = useState(false);
    const emailConfirmRequired = Boolean(hold?.emailConfirmRequired);

    const onEnter = async () => {
        setEnterLoading(true);
        setError('');
        try {
            clearRegistrationReviewHold();
            if (!user) {
                await enterLocalGuest();
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'تعذّر الدخول');
            markRegistrationReviewHold(emailConfirmRequired);
        } finally {
            setEnterLoading(false);
        }
    };

    const onResend = async () => {
        const email = String(user?.email ?? '').trim();
        if (!email.includes('@')) {
            setError('أدخل بريدك من تسجيل الدخول لإعادة إرسال التأكيد');
            return;
        }
        setResendLoading(true);
        setError('');
        try {
            const message = await resendEmailConfirmation(email);
            SmartToast.success(message);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'تعذّر إعادة الإرسال');
        } finally {
            setResendLoading(false);
        }
    };

    return (
        <div
            className="hami-auth-gate-shell"
            data-testid="lawyer-register-review-hold"
            data-hami-auth-gate=""
            role="main"
            aria-label="انتظار اعتماد التسجيل"
        >
            <div className="hami-auth-gate-panel">
                <LawyerRegisterCompleteStep
                    emailConfirmRequired={emailConfirmRequired}
                    loading={false}
                    resendLoading={resendLoading}
                    enterLoading={enterLoading}
                    error={error}
                    onResendConfirm={() => void onResend()}
                    onEnterWithoutWaiting={() => void onEnter()}
                />
            </div>
        </div>
    );
}

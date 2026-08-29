import React, { useEffect, useState, type ReactElement } from 'react';
import {
    lawyerVerificationBannerKind,
    networkAccessDenialMessage,
} from '@/app/services/auth/lawyerAccountStatus';
import { subscribeLawyerVerificationStore } from '@/app/services/auth/lawyerVerificationStore';

type Props = {
    userId: string | null | undefined;
    userMetadata?: Record<string, unknown> | null;
};

/**
 * شريط حالة التدقيق — يظهر فقط لـ pending/rejected المؤكدين، دون وميض بعد إعادة التحميل.
 */
export function LawyerVerificationStatusBanner({
    userId,
    userMetadata,
}: Props): ReactElement | null {
    const [, setEpoch] = useState(0);
    useEffect(() => subscribeLawyerVerificationStore(() => setEpoch((n) => n + 1)), []);

    const kind = lawyerVerificationBannerKind(userId, userMetadata);
    if (!kind) return null;

    return (
        <div
            role="status"
            data-testid="lawyer-verification-status-banner"
            className="mx-3 mt-2 rounded-xl border border-[#E6C673]/35 bg-[#E6C673]/10 px-3 py-2 text-center text-xs text-[#E6C673] sm:text-sm"
        >
            {networkAccessDenialMessage(kind)}
        </div>
    );
}

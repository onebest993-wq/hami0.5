import { useMemo } from 'react';

export interface StatuteStatus {
    daysRemaining: number;
    yearsRemaining: number;
    isCritical: boolean;
    isExpired: boolean;
}

export function useStatuteOfLimitations(
    isAlimonyClaim: boolean,
    lastActionDate: string | null | undefined,
    dossierLastActionDate: string | null | undefined,
    debtorNotificationDate: string | null | undefined,
): StatuteStatus | null {
    return useMemo(() => {
        if (isAlimonyClaim) return null;

        const actionDate =
            dossierLastActionDate || lastActionDate || debtorNotificationDate;
        if (!actionDate) return null;

        const lastAction = new Date(actionDate);
        const now = new Date();
        const daysPassed = Math.floor((now.getTime() - lastAction.getTime()) / (1000 * 60 * 60 * 24));
        const sevenYearsInDays = 7 * 365;
        const daysRemaining = sevenYearsInDays - daysPassed;
        const yearsRemaining = daysRemaining / 365;

        return {
            daysRemaining,
            yearsRemaining,
            isCritical: yearsRemaining <= 0.5,
            isExpired: daysRemaining <= 0,
        };
    }, [isAlimonyClaim, dossierLastActionDate, lastActionDate, debtorNotificationDate]);
}

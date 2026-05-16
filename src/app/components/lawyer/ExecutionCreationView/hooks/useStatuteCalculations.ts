import { useMemo } from 'react';

export function useStatuteCalculations(
    lastProcedureDate: string,
    claimType: string,
    notificationDate: string
) {
    const calculateStatuteOfLimitations = useMemo(() => {
        if (!lastProcedureDate) return null;

        const lastDate = new Date(lastProcedureDate);
        const today = new Date();
        const sevenYearsLater = new Date(lastDate);
        sevenYearsLater.setFullYear(sevenYearsLater.getFullYear() + 7);

        const daysRemaining = Math.floor((sevenYearsLater.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const yearsRemaining = Math.floor(daysRemaining / 365);
        const monthsRemaining = Math.floor((daysRemaining % 365) / 30);

        const isContinuousAlimony = claimType === 'نفقة' || claimType === 'حجة نفقة اتفاقية';

        return {
            expiryDate: sevenYearsLater,
            daysRemaining,
            yearsRemaining,
            monthsRemaining,
            isExpired: daysRemaining <= 0,
            isNearExpiry: daysRemaining <= 365 && daysRemaining > 0,
            isCritical: daysRemaining <= 180 && daysRemaining > 0,
            isExempt: isContinuousAlimony,
            message: isContinuousAlimony
                ? 'النفقة المستمرة مستثناة من التقادم السباعي'
                : daysRemaining <= 0
                    ? 'انتهت المدة القانونية - الإضبارة معرضة للإبطال!'
                    : daysRemaining <= 180
                        ? `تنبيه حرج: ${daysRemaining} يوم متبقي قبل التقادم!`
                        : `باقي ${yearsRemaining} سنة و ${monthsRemaining} شهر قبل التقادم`
        };
    }, [lastProcedureDate, claimType]);

    const calculateNotificationPeriod = useMemo(() => {
        if (!notificationDate) return null;

        const notifyDate = new Date(notificationDate);
        const today = new Date();
        const sevenDaysLater = new Date(notifyDate);
        sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

        const daysRemaining = Math.floor((sevenDaysLater.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        return {
            expiryDate: sevenDaysLater,
            daysRemaining,
            isWithinPeriod: daysRemaining >= 0,
            message: daysRemaining >= 0
                ? `باقي ${daysRemaining} يوم للتنفيذ الرضائي (إعفاء من رسم 3%)`
                : `انتهت مدة الإعفاء - رسم التحصيل 3% واجب الدفع`
        };
    }, [notificationDate]);

    return { calculateStatuteOfLimitations, calculateNotificationPeriod };
}

import {
    calculateDaysRemaining,
    calculateGracePeriodEndDate,
    formatDateToLocalYmd,
    isGracePeriodExpired,
    parseLocalNotificationDate,
} from '@/app/utils/executionStateMachine';

export type ExecutionSummons7DayWindow = {
    notificationDateYmd: string;
    startDateYmd: string;
    expiryDateYmd: string;
    isExpired: boolean;
    daysRemaining: number;
};

function toLocalNoon(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

export function getExecutionSummons7DayWindow(
    notificationDateYmd: string,
    currentDate: Date = new Date()
): ExecutionSummons7DayWindow {
    const notif = parseLocalNotificationDate(notificationDateYmd);
    if (Number.isNaN(notif.getTime())) {
        return {
            notificationDateYmd,
            startDateYmd: '',
            expiryDateYmd: '',
            isExpired: false,
            daysRemaining: 0,
        };
    }
    const start = toLocalNoon(notif);
    start.setDate(start.getDate() + 1);
    const expiry = calculateGracePeriodEndDate(notificationDateYmd, 0);
    const now = toLocalNoon(currentDate);
    const expired = now.getTime() >= toLocalNoon(expiry).getTime();
    const remaining = calculateDaysRemaining(notificationDateYmd, currentDate, 0);
    return {
        notificationDateYmd,
        startDateYmd: formatDateToLocalYmd(start),
        expiryDateYmd: formatDateToLocalYmd(expiry),
        isExpired: expired || isGracePeriodExpired(notificationDateYmd, currentDate, 0),
        daysRemaining: remaining,
    };
}


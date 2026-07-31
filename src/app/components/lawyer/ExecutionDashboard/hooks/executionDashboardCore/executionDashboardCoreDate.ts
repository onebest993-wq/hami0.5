function isValidDate(value: Date): boolean {
    return !Number.isNaN(value.getTime());
}

function toLocalNoonDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

export function parseLocalNotificationDate(ymd: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
    if (!match) {
        const fallback = new Date(ymd);
        return Number.isNaN(fallback.getTime()) ? new Date(Number.NaN) : fallback;
    }

    const year = Number(match[1]);
    const monthIndex = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

export function formatDateToLocalYmd(date: Date): string {
    if (!date || Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getLocalTodayYmd(now: Date = new Date()): string {
    return formatDateToLocalYmd(now);
}

export function calculateActualDaysElapsed(
    notificationDate: string,
    currentDate: Date = new Date(),
): number {
    const notification = parseLocalNotificationDate(notificationDate);
    if (!isValidDate(notification)) return 0;

    const startDate = toLocalNoonDate(notification);
    startDate.setDate(startDate.getDate() + 1);

    const endDate = toLocalNoonDate(currentDate);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
}

export function calculateGracePeriodEndDate(
    notificationDate: string,
    extraCalendarDays: number = 0,
): Date {
    const notification = parseLocalNotificationDate(notificationDate);
    if (!isValidDate(notification)) {
        return new Date(Number.NaN);
    }

    const startDate = toLocalNoonDate(notification);
    startDate.setDate(startDate.getDate() + 1);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7 + Math.max(0, extraCalendarDays));
    return endDate;
}

export function isGracePeriodExpired(
    notificationDate: string,
    currentDate: Date = new Date(),
    extraCalendarDays: number = 0,
): boolean {
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const total = 7 + Math.max(0, extraCalendarDays);
    return daysElapsed >= total;
}

export function calculateDaysRemaining(
    notificationDate: string,
    currentDate: Date = new Date(),
    extraCalendarDays: number = 0,
): number {
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const total = 7 + Math.max(0, extraCalendarDays);
    return Math.max(0, total - daysElapsed);
}

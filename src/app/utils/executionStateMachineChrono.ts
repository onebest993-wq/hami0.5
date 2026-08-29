/**
 * Execution state machine — chrono / grace math (Iraqi Execution Law Arts. 19–27).
 */
import { formatDateToLocalYmd } from '@/app/utils/localYmd';

/**
 * Iraqi Public Holidays (2026)
 */
const IRAQI_HOLIDAYS_2026: string[] = [
    '2026-01-01', // New Year
    '2026-01-06', // Army Day
    '2026-04-09', // Eid al-Fitr (estimated)
    '2026-04-10', // Eid al-Fitr
    '2026-04-11', // Eid al-Fitr
    '2026-06-15', // Eid al-Adha (estimated)
    '2026-06-16', // Eid al-Adha
    '2026-06-17', // Eid al-Adha
    '2026-06-18', // Eid al-Adha
    '2026-07-06', // Islamic New Year (estimated)
    '2026-10-03', // National Day
    // Add more as needed
];

// ═══════════════════════════════════════════════════════════════════════════
// CORE CHRONO-MATH ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * تحويل YYYY-MM-DD إلى تاريخ تقويمي محلي (يتجنب انزياح UTC مع new Date("yyyy-mm-dd"))
 */
export function parseLocalNotificationDate(ymd: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).trim());
    if (!m) {
        const d = new Date(ymd);
        return Number.isNaN(d.getTime()) ? new Date(Number.NaN) : d;
    }
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    return new Date(y, mo, d, 12, 0, 0, 0);
}

function isValidDate(value: Date): boolean {
    return !Number.isNaN(value.getTime());
}

function toLocalNoonDate(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/**
 * Check if a date is a weekend (Friday/Saturday in Iraq)
 */
export function isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 5 || day === 6; // Friday = 5, Saturday = 6
}

/**
 * Check if a date is an Iraqi public holiday
 */
export function isPublicHoliday(date: Date): boolean {
    const dateStr = formatDateToLocalYmd(date);
    return dateStr !== '' && IRAQI_HOLIDAYS_2026.includes(dateStr);
}

/**
 * Check if a date is a working day (not weekend, not holiday)
 */
export function isWorkingDay(date: Date): boolean {
    return !isWeekend(date) && !isPublicHoliday(date);
}

/**
 * Calculate the next working day from a given date
 */
export function getNextWorkingDay(date: Date): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    while (!isWorkingDay(nextDay)) {
        nextDay.setDate(nextDay.getDate() + 1);
    }
    
    return nextDay;
}

/**
 * نهاية مهلة الرضا (أيام تقويمية بحتة من اليوم التالي للإخبار) + اختياري يوم إضافي بقرار المحامي فقط.
 * لا يُمدّد تلقائياً لعطلة نهاية الأسبوع أو رسمية — ذلك قرار يدوي من الواجهة.
 */
export function calculateGracePeriodEnd(notificationDate: string, manualHolidayExtension: boolean = false): {
    endDate: Date;
    isExtended: boolean;
    extensionReason?: string;
} {
    const extra = manualHolidayExtension ? 1 : 0;
    const endDate = calculateGracePeriodEndDate(notificationDate, extra);
    return {
        endDate,
        isExtended: manualHolidayExtension,
        extensionReason: manualHolidayExtension ? 'تمديد يدوي بقرار المحامي (+يوم تقويمي)' : '',
    };
}

/**
 * Calculate days elapsed since notification (only counting working days)
 */
export function calculateDaysElapsed(notificationDate: string, currentDate: Date = new Date()): number {
    const startDate = parseLocalNotificationDate(notificationDate);
    if (!isValidDate(startDate)) return 0;
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(currentDate);
    endDate.setHours(0, 0, 0, 0);
    
    let daysElapsed = 0;
    const iterDate = new Date(startDate);
    
    while (iterDate < endDate) {
        iterDate.setDate(iterDate.getDate() + 1);
        if (isWorkingDay(iterDate)) {
            daysElapsed++;
        }
    }
    
    return daysElapsed;
}

/**
 * 🆕 حساب الأيام الفعلية المنقضية منذ التبليغ (وليس أيام العمل)
 * ✅ القانون العراقي: الاحتساب يبدأ من اليوم التالي للتبليغ
 * ✅ 7 أيام فعلية (تشمل عطل نهاية الأسبوع والعطل الرسمية)
 */
export function calculateActualDaysElapsed(notificationDate: string, currentDate: Date = new Date()): number {
    const notif = parseLocalNotificationDate(notificationDate);
    if (!isValidDate(notif)) return 0;
    const startDate = toLocalNoonDate(notif);
    // الاحتساب يبدأ من اليوم التالي لتاريخ الإخبار الفعلي (كما يختاره المحامي)
    startDate.setDate(startDate.getDate() + 1);

    const endDate = toLocalNoonDate(currentDate);

    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
}

/** أول يوم يُسمح فيه بالإجراء الجبري بعد انتهاء المهلة: اليوم التالي للإخبار + 7 أيام تقويمية (+إضافي اختياري) */
export function calculateGracePeriodEndDate(notificationDate: string, extraCalendarDays: number = 0): Date {
    const notif = parseLocalNotificationDate(notificationDate);
    if (!isValidDate(notif)) {
        return new Date(Number.NaN);
    }
    const startDate = toLocalNoonDate(notif);
    startDate.setDate(startDate.getDate() + 1);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7 + Math.max(0, extraCalendarDays));

    return endDate;
}

/**
 * 🆕 حساب الأيام المتبقية في المهلة الرضائية
 */
export function calculateDaysRemaining(
    notificationDate: string,
    currentDate: Date = new Date(),
    extraCalendarDays: number = 0
): number {
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const total = 7 + Math.max(0, extraCalendarDays);
    return Math.max(0, total - daysElapsed);
}

/**
 * 🆕 التحقق من انتهاء المهلة الرضائية (هل مر أكثر من 7 أيام؟)
 */
export function isGracePeriodExpired(
    notificationDate: string,
    currentDate: Date = new Date(),
    extraCalendarDays: number = 0
): boolean {
    const daysElapsed = calculateActualDaysElapsed(notificationDate, currentDate);
    const total = 7 + Math.max(0, extraCalendarDays);
    return daysElapsed >= total;
}

/** YYYY-MM-DD حسب تقويم الجهاز — بلا UTC drift من toISOString. */

export function formatDateToLocalYmd(d: Date): string {
    if (!d || Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
}

/** اليوم الحالي وفق منطقة زمنية الجهاز — للحقول اليومية لا للطابع الفوري */
export function getLocalTodayYmd(now: Date = new Date()): string {
    return formatDateToLocalYmd(now);
}

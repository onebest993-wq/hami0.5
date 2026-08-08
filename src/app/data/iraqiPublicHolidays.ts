/**
 * أعياد العراق الرسمية — بيانات قابلة للتحديث دون تعديل منطق المهل.
 * التواريخ التقديرية للأعياد الشرعية تُحدَّث سنوياً من هنا.
 */
export const IRAQI_PUBLIC_HOLIDAYS: string[] = [
    '2026-01-01', // رأس السنة
    '2026-01-06', // يوم الجيش
    '2026-04-09', // عيد الفطر (تقديري)
    '2026-04-10',
    '2026-04-11',
    '2026-06-15', // عيد الأضحى (تقديري)
    '2026-06-16',
    '2026-06-17',
    '2026-06-18',
    '2026-07-06', // رأس السنة الهجرية (تقديري)
    '2026-10-03', // اليوم الوطني
];

export function isIraqiPublicHolidayYmd(ymd: string): boolean {
    const normalized = String(ymd || '').trim();
    return normalized !== '' && IRAQI_PUBLIC_HOLIDAYS.includes(normalized);
}

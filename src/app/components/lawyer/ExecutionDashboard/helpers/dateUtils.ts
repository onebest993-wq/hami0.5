/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📅 Date Utilities - دوال مساعدة للتعامل مع التواريخ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * دوال مساعدة للتعامل مع التواريخ والتنسيقات الزمنية
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

// ═══════════════════════════════════════════════════════════════════════════
// DATE FORMATTING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * إرجاع تاريخ اليوم بصيغة YYYY-MM-DD (التوقيت المحلي)
 */
export function evictionLocalYmdToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * حساب عدد الأيام التقويمية شاملاً يوم البداية ويوم النهاية
 */
export function evictionInclusiveCalendarDays(startYmd: string, endYmd: string): number {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startYmd) || !/^\d{4}-\d{2}-\d{2}$/.test(endYmd)) return 0;
    
    const [ys, ms, ds] = startYmd.split('-').map(Number);
    const [ye, me, de] = endYmd.split('-').map(Number);
    
    const s = new Date(ys, ms - 1, ds);
    const e = new Date(ye, me - 1, de);
    const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
    
    return diff >= 0 ? diff + 1 : 0;
}
/** YYYY-MM-DD حسب تقويم الجهاز — بلا UTC drift من toISOString. */

export function formatDateToLocalYmd(d: Date | string): string {
    if (typeof d === 'string') {
        const m = d.match(/^(\d{4}-\d{2}-\d{2})/);
        return m ? m[1] : '';
    }
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

/** جمع أيام على تاريخ محلي YYYY-MM-DD دون انجراف UTC. */
export function addDaysToLocalYmd(ymd: string, days: number): string {
    const m = String(ymd || '').match(/^(\d{4}-\d{2}-\d{2})/);
    if (!m) return '';
    const [y, mo, d] = m[1].split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    dt.setDate(dt.getDate() + days);
    return formatDateToLocalYmd(dt);
}

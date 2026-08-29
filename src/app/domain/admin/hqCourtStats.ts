/**
 * صفوف محاكم المقر — تطهير مشترك للعميل قبل الرسم.
 * الحد يطابق تجميع الخادم حتى لا تُعرض قائمة مفتوحة.
 */
import { clampHqCount, stripHqControlChars } from '@/app/domain/admin/hqSafeText';

export const HQ_COURT_STATS_CAP = 60;

export type HqCourtStat = {
    court: string;
    lawsuits: number;
    transactions: number;
};

export function sanitizeHqCourtLabel(raw: unknown): string {
    return stripHqControlChars(String(raw ?? '').replace(/\s+/g, ' '), 80);
}

export function sanitizeHqCourtRows(rows: unknown): HqCourtStat[] {
    if (!Array.isArray(rows)) return [];
    const byCourt = new Map<string, HqCourtStat>();
    for (const row of rows) {
        if (!row || typeof row !== 'object') continue;
        const rec = row as { court?: unknown; lawsuits?: unknown; transactions?: unknown };
        const court = sanitizeHqCourtLabel(rec.court);
        if (!court) continue;
        const prev = byCourt.get(court);
        const lawsuits = clampHqCount(rec.lawsuits);
        const transactions = clampHqCount(rec.transactions);
        if (prev) {
            prev.lawsuits = Math.min(prev.lawsuits + lawsuits, 1_000_000_000);
            prev.transactions = Math.min(prev.transactions + transactions, 1_000_000_000);
        } else {
            byCourt.set(court, { court, lawsuits, transactions });
        }
        if (byCourt.size >= HQ_COURT_STATS_CAP) break;
    }
    return [...byCourt.values()];
}

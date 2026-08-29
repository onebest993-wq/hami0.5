import type { SupabaseClient } from '@supabase/supabase-js';
import { raceBudget } from './promiseBudget.ts';

export const HEADQUARTERS_STATS_ROW_CAP = 8000;
export const HEADQUARTERS_STATS_COURT_CAP = 60;

export type HeadquartersCourtStat = {
    court: string;
    lawsuits: number;
    transactions: number;
};

export function normalizeCourtLabel(raw: unknown): string {
    const s = String(raw ?? '')
        .replace(/[\u0000-\u001F\u007F]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
    return s || 'غير محدد';
}

function asCourtCount(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.min(Math.floor(n), 1_000_000_000);
}

async function countByCourt(
    admin: SupabaseClient,
    table: 'lawsuit_files' | 'execution_files',
): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    try {
        const { data, error } = await admin
            .from(table)
            .select('court')
            .eq('status', 'active')
            .limit(HEADQUARTERS_STATS_ROW_CAP);
        if (error) {
            return counts;
        }
        if (!Array.isArray(data)) return counts;
        for (const row of data) {
            if (!row || typeof row !== 'object') continue;
            const court = normalizeCourtLabel((row as { court?: unknown }).court);
            counts.set(court, (counts.get(court) ?? 0) + 1);
        }
    } catch {
        return counts;
    }
    return counts;
}

export function mergeCourtCounts(
    lawsuits: Map<string, number>,
    executions: Map<string, number>,
): HeadquartersCourtStat[] {
    const courts = new Set<string>([...lawsuits.keys(), ...executions.keys()]);
    const rows: HeadquartersCourtStat[] = [];
    for (const court of courts) {
        rows.push({
            court,
            lawsuits: asCourtCount(lawsuits.get(court)),
            /**
             * واجهة المقر تسمّي الحقل الثاني «معاملات رسمية».
             * المصدر السحابي الوحيد بعمود محكمة عدا الدعاوى هو execution_files.
             */
            transactions: asCourtCount(executions.get(court)),
        });
    }
    rows.sort((a, b) => b.lawsuits + b.transactions - (a.lawsuits + a.transactions));
    return rows.slice(0, HEADQUARTERS_STATS_COURT_CAP);
}

function mapRpcCourtRows(data: unknown): HeadquartersCourtStat[] | null {
    if (!Array.isArray(data)) return null;
    const rows: HeadquartersCourtStat[] = [];
    for (const row of data) {
        if (!row || typeof row !== 'object') continue;
        const rec = row as { court?: unknown; lawsuits?: unknown; executions?: unknown };
        rows.push({
            court: normalizeCourtLabel(rec.court),
            lawsuits: asCourtCount(rec.lawsuits),
            transactions: asCourtCount(rec.executions),
        });
    }
    return rows.slice(0, HEADQUARTERS_STATS_COURT_CAP);
}

export const HEADQUARTERS_STATS_RPC_BUDGET_MS = 2_500;
export const HEADQUARTERS_STATS_SCAN_BUDGET_MS = 3_500;
export const HEADQUARTERS_COURT_STATS_CACHE_TTL_MS = 8_000;

type CourtCacheBox = { expiresAt: number; courts: HeadquartersCourtStat[] };
let courtCache: CourtCacheBox | null = null;
let courtInflight: Promise<HeadquartersCourtStat[]> | null = null;

export function resetHeadquartersCourtStatsCacheForTests(): void {
    courtCache = null;
    courtInflight = null;
}

export async function listHeadquartersCourtStats(
    admin: SupabaseClient,
): Promise<HeadquartersCourtStat[]> {
    try {
        const rpcResult = await raceBudget(
            Promise.resolve().then(() => admin.rpc('headquarters_court_counts')),
            HEADQUARTERS_STATS_RPC_BUDGET_MS,
        );
        if (rpcResult) {
            const { data, error } = rpcResult as {
                data: unknown;
                error: { message?: string } | null;
            };
            if (!error) {
                const mapped = mapRpcCourtRows(data);
                if (mapped && mapped.length > 0) return mapped;
            }
            /* RPC فارغ أو مفقود أو معطوب — مسح محدود بدل إسقاط اللوحة */
        }

        const scanned = await raceBudget(
            Promise.all([
                countByCourt(admin, 'lawsuit_files'),
                countByCourt(admin, 'execution_files'),
            ]).then(([lawsuits, executions]) => mergeCourtCounts(lawsuits, executions)),
            HEADQUARTERS_STATS_SCAN_BUDGET_MS,
        );
        return scanned ?? [];
    } catch {
        return [];
    }
}

export async function listHeadquartersCourtStatsCached(
    admin: SupabaseClient,
    opts?: { fresh?: boolean },
): Promise<HeadquartersCourtStat[]> {
    const now = Date.now();
    if (!opts?.fresh && courtCache && courtCache.expiresAt > now) {
        return courtCache.courts;
    }
    if (courtInflight) return courtInflight;
    courtInflight = (async () => {
        const courts = await listHeadquartersCourtStats(admin);
        courtCache = { expiresAt: Date.now() + HEADQUARTERS_COURT_STATS_CACHE_TTL_MS, courts };
        return courts;
    })().finally(() => {
        courtInflight = null;
    });
    return courtInflight;
}

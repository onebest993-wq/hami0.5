// @ts-nocheck
import type { ExecutionFile } from '@/app/types/execution';
import { hasOngoingAlimonyInExecution } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { parseAmount } from '@/app/utils/execution/amountInputCore';

export interface SalaryDeductionBreakdown {
    ongoingAlimonyIqd: number;
    accumulatedFifthIqd: number;
    totalIqd: number;
}

export function parseSalaryIqdInput(raw: string): number {
    const n = parseAmount(raw);
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
}

/** النفقة الشهرية المستمرة — من بيانات الإضبارة */
export function resolveOngoingMonthlyAlimonyIqd(executionData: ExecutionFile | null | undefined): number {
    if (!executionData) return 0;
    const ed = executionData as Record<string, unknown>;
    const wife =
        readMoneyField(ed, 'monthlyWifeAlimony') ??
        readMoneyField(ed, 'monthly_wife_alimony') ??
        readMoneyField(ed, 'monthlyAlimony');
    const perChild =
        readMoneyField(ed, 'monthlyChildrenAlimony') ?? readMoneyField(ed, 'monthly_children_alimony') ?? 0;
    const children = Math.max(1, Math.trunc(Number(ed.children_count ?? ed.childrenCount ?? 1) || 1));
    const wifePart = wife ?? (perChild > 0 ? 0 : readMoneyField(ed, 'monthlyAlimony') ?? 0);
    return Math.max(0, Math.trunc(wifePart + perChild * children));
}

function readMoneyField(ed: Record<string, unknown>, key: string): number | null {
    const v = ed[key];
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : parseAmount(String(v));
    return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}

/** اقتراح الخصم: نفقة مستمرة + خُمس الراتب للمتراكم | أو خُمس فقط للموظف | اختياري للدين */
export function resolveSuggestedSalaryDeductionBreakdown(opts: {
    executionData: ExecutionFile | null | undefined;
    claimType?: string;
    salaryIqd: number;
    activeDebtorIsEmployee?: boolean;
}): SalaryDeductionBreakdown {
    const salary = Math.max(0, Math.trunc(opts.salaryIqd || 0));
    const fifth = salary > 0 ? Math.trunc(salary / 5) : 0;
    const isAlimony = hasOngoingAlimonyInExecution(
        opts.executionData as Record<string, unknown> | null | undefined,
        opts.claimType
    );
    if (isAlimony) {
        const ongoing = resolveOngoingMonthlyAlimonyIqd(opts.executionData);
        return {
            ongoingAlimonyIqd: ongoing,
            accumulatedFifthIqd: fifth,
            totalIqd: ongoing + fifth,
        };
    }
    if (opts.activeDebtorIsEmployee && fifth > 0) {
        return { ongoingAlimonyIqd: 0, accumulatedFifthIqd: fifth, totalIqd: fifth };
    }
    return { ongoingAlimonyIqd: 0, accumulatedFifthIqd: 0, totalIqd: 0 };
}

/** تسجيل تحصيل في المركز المالي — يُلتقط عبر hami-unified-ledger-external-collect */
export function dispatchSalaryDeductionToFinancialCenter(input: {
    executionId: string;
    amountIqd: number;
    decisionRowId: string;
    sourceLabel?: string;
}): boolean {
    const exId = String(input.executionId || '').trim();
    const amt = Math.max(0, Math.trunc(input.amountIqd || 0));
    if (!exId || amt <= 0) return false;
    const at = new Date().toISOString();
    const monthKey = at.slice(0, 7);
    try {
        window.dispatchEvent(
            new CustomEvent('hami-unified-ledger-external-collect', {
                detail: {
                    executionId: exId,
                    payment: {
                        id: `pay-salary-${input.decisionRowId}-${monthKey}-${Date.now()}`,
                        amount: amt,
                        at,
                        source: input.sourceLabel || 'salary_garnishment',
                    },
                },
            })
        );
        return true;
    } catch {
        return false;
    }
}

export function findSeizedSalaryAssetByDecisionId(
    executionData: ExecutionFile | null | undefined,
    decisionRowId: string
): Record<string, unknown> | null {
    const did = String(decisionRowId || '').trim();
    if (!did) return null;
    const assets = Array.isArray(executionData?.seizedAssets) ? executionData!.seizedAssets! : [];
    for (const raw of assets) {
        const a = raw as Record<string, unknown>;
        if (String(a.type || '') !== 'salary') continue;
        const det =
            typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                ? (a.details as Record<string, unknown>)
                : null;
        if (String(det?.decisionRowId || '').trim() === did) return a;
    }
    return null;
}

export function readMonthlyDeductionFromAsset(asset: Record<string, unknown> | null): number {
    if (!asset) return 0;
    const det =
        typeof asset.details === 'object' && asset.details && !Array.isArray(asset.details)
            ? (asset.details as Record<string, unknown>)
            : null;
    const raw = det?.monthlyDeductionIqd ?? det?.monthlyDeduction ?? null;
    if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return Math.trunc(raw);
    const parsed = parseAmount(String(raw ?? ''));
    return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
}

export type SalaryDeductionLogRow = {
    id: string;
    decisionRowId: string;
    amountIqd: number;
    at: string;
    ymd: string;
};

export function readSalaryDeductionLog(
    executionData: ExecutionFile | null | undefined,
    decisionRowId?: string
): SalaryDeductionLogRow[] {
    const raw = (executionData as Record<string, unknown> | null | undefined)?.salary_deduction_log;
    const logs = Array.isArray(raw) ? (raw as SalaryDeductionLogRow[]) : [];
    const did = String(decisionRowId || '').trim();
    if (!did) return logs;
    return logs.filter((row) => String(row?.decisionRowId || '').trim() === did);
}

/** أحدث حجز راتب نشط جاهز لتسجيل الخصم */
export function pickPrimarySalarySeizureForDeduction(
    assets: Array<Record<string, unknown>>
): Record<string, unknown> | null {
    const seized = assets.filter((a) => String(a.status || '') === 'seized');
    if (seized.length === 0) return null;
    const ready = seized.filter((a) => {
        const det =
            typeof a.details === 'object' && a.details && !Array.isArray(a.details)
                ? (a.details as Record<string, unknown>)
                : null;
        return Boolean(String(det?.employerName || '').trim());
    });
    const pool = ready.length > 0 ? ready : seized;
    return pool.reduce((best, cur) => {
        const aDate = String(cur.seizureDate || '');
        const bDate = String(best.seizureDate || '');
        return bDate.localeCompare(aDate, undefined, { numeric: true }) > 0 ? cur : best;
    }, pool[0]);
}

export function applySalaryMonthlyDeduction(input: {
    executionId: string;
    executionData: ExecutionFile | null | undefined;
    decisionRowId: string;
    amountIqd: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    getLocalTodayYmd?: () => string;
}): boolean {
    const exId = String(input.executionId || '').trim();
    const did = String(input.decisionRowId || '').trim();
    const amt = Math.max(0, Math.trunc(input.amountIqd || 0));
    if (!exId || !did || amt <= 0) return false;

    const ok = dispatchSalaryDeductionToFinancialCenter({
        executionId: exId,
        amountIqd: amt,
        decisionRowId: did,
        sourceLabel: 'خصم من الراتب',
    });
    if (!ok) return false;

    const now = new Date().toISOString();
    const ymd = input.getLocalTodayYmd?.() ?? now.slice(0, 10);
    const prevLogs = readSalaryDeductionLog(input.executionData);
    const logRow: SalaryDeductionLogRow = {
        id: `sdl_${did}_${Date.now()}`,
        decisionRowId: did,
        amountIqd: amt,
        at: now,
        ymd,
    };
    input.persistExecutionMerge({
        salary_deduction_log: [logRow, ...prevLogs],
    });
    return true;
}

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

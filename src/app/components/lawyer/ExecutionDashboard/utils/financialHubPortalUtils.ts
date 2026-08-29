import type { ExecutionFile } from '@/app/types/execution';

export const MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE = '⚠️ نكس التسوية الشهرية';

export function resolveFinancialHubExecutionId(
    executionData?: { id?: string } | null,
    executionId?: string
): string | undefined {
    const resolved = String(executionData?.id ?? executionId ?? '').trim();
    return resolved && resolved !== 'undefined' ? resolved : undefined;
}

export type GhuramaaDistributionDetail = {
    creditorId?: string;
    creditorName?: string;
    debtBeforeDistribution?: number;
    amountDistributed?: number;
};

export type GhuramaaDistributionArgs = {
    transactionId?: string;
    dateIso?: string;
    totalAmountDistributed?: number;
    distributionDetails?: GhuramaaDistributionDetail[];
};

export function buildGhuramaaDistributionMergePatch(input: {
    executionData: ExecutionFile | Record<string, unknown> | null | undefined;
    creditors: unknown[];
    args: GhuramaaDistributionArgs;
}): Record<string, unknown> {
    const { executionData, creditors, args } = input;
    const details = Array.isArray(args.distributionDetails) ? args.distributionDetails : [];
    const total = Math.max(0, Math.trunc(Number(args.totalAmountDistributed ?? 0) || 0));
    const ts = String(args.dateIso || new Date().toISOString());
    const transactionId = String(args.transactionId || `ghr-${Date.now()}`);
    const prevLogs = Array.isArray((executionData as ExecutionFile | null | undefined)?.ghuramaDistributionLogs)
        ? (((executionData as ExecutionFile).ghuramaDistributionLogs as unknown[]) || [])
        : [];

    const nextLog = {
        transactionId,
        dateIso: ts,
        totalAmountDistributed: total,
        distributionDetails: details.map((d) => ({
            creditorId: String(d?.creditorId ?? '').trim(),
            creditorName: String(d?.creditorName ?? 'دائن').trim() || 'دائن',
            debtBeforeDistribution: Math.max(0, Math.trunc(Number(d?.debtBeforeDistribution ?? 0) || 0)),
            amountDistributed: Math.max(0, Math.trunc(Number(d?.amountDistributed ?? 0) || 0)),
        })),
    };

    const applyPaidShare = (c: Record<string, unknown>, id: string) => {
        const hit = nextLog.distributionDetails.find((x) => String(x.creditorId) === id);
        if (!hit) return c;
        const prevPaidRaw = c?.paid_amount ?? c?.paidAmount ?? c?.paidDebtAmountIqd ?? 0;
        const prevPaid = Number(prevPaidRaw);
        const paidSafe = Number.isFinite(prevPaid) ? Math.max(0, Math.trunc(prevPaid)) : 0;
        return { ...c, paid_amount: paidSafe + hit.amountDistributed };
    };

    const nextCreditors = (Array.isArray(creditors) ? creditors : []).map((c) =>
        applyPaidShare(c as Record<string, unknown>, String((c as Record<string, unknown>)?.id ?? '').trim())
    );
    const pmBase = (executionData?.party_multiplicity as Record<string, unknown> | undefined) ?? {};
    const nextAdditionalCreditors = (
        Array.isArray(pmBase.additionalCreditors) ? pmBase.additionalCreditors : []
    ).map((c) =>
        applyPaidShare(c as Record<string, unknown>, String((c as Record<string, unknown>)?.id ?? '').trim())
    );

    return {
        creditors: nextCreditors,
        creditor: nextCreditors[0] ?? (executionData as Record<string, unknown> | undefined)?.creditor,
        party_multiplicity: {
            ...pmBase,
            additionalCreditors: nextAdditionalCreditors,
        },
        ghuramaDistributionLogs: [nextLog, ...prevLogs],
    };
}

export function computeMonthlySettlementDelayCount(input: {
    dueDate: string;
    prevDueDate: string;
    prevDelayCount: number;
}): number {
    const dueDate = String(input.dueDate || '').trim();
    const prevDue = String(input.prevDueDate || '').trim();
    const safePrevDelay = Number.isFinite(input.prevDelayCount) ? Math.max(0, input.prevDelayCount) : 0;
    if (dueDate && prevDue === dueDate) return safePrevDelay + 1;
    return 1;
}

export type CaseTaskRow = {
    id?: string;
    title?: string;
    body?: string;
    dueDate?: string;
    createdAt?: string;
    trashedAt?: string | null;
};

export function appendMonthlySettlementDefaultTask(input: {
    prevTasks: CaseTaskRow[];
    dueDate: string;
    amount: number;
    todayYmd: string;
    nextTimelineId: () => string;
}): { nextTasks: CaseTaskRow[]; nextDelay: number; created: boolean } {
    const ts = new Date().toISOString();
    const title = MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE;
    const body = `لم يتم دفع التسوية المستحقة بتاريخ ${input.dueDate} بمبلغ ${Math.max(0, input.amount).toLocaleString(
        'ar-IQ'
    )} د.ع.\nيلزم اتخاذ إجراءات جبريّة.`;
    const exists = input.prevTasks.some(
        (t) =>
            !t?.trashedAt &&
            String(t?.title || '').trim() === title &&
            String(t?.dueDate || '').trim() === String(input.dueDate || '').trim()
    );
    if (exists) {
        return { nextTasks: input.prevTasks, nextDelay: 1, created: false };
    }
    return {
        nextTasks: [
            ...input.prevTasks,
            {
                id: input.nextTimelineId(),
                title,
                body,
                dueDate: String(input.dueDate || input.todayYmd).trim(),
                createdAt: ts,
            },
        ],
        nextDelay: 1,
        created: true,
    };
}

export function trashMonthlySettlementDefaultTasks(
    prevTasks: CaseTaskRow[],
    dueDate: string
): CaseTaskRow[] {
    const ts = new Date().toISOString();
    return prevTasks.map((t) => {
        if (
            !t?.trashedAt &&
            String(t?.title || '').trim() === MONTHLY_SETTLEMENT_DEFAULT_TASK_TITLE &&
            String(t?.dueDate || '').trim() === String(dueDate || '').trim()
        ) {
            return { ...t, trashedAt: ts };
        }
        return t;
    });
}

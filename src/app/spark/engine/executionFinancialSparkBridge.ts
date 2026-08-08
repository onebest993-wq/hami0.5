import type { ExecutionFile } from '@/app/types/execution';
import type { PendingSettlement } from '@/app/components/lawyer/FinancialOperationsCenter/types';
import type { UnifiedLedgerTotalParams } from '@/app/slices/financial/ledgerPublic';
import {
    parseUnifiedLedgerFromStorage,
    resolveSettlementGuarantorGateFromLedger,
    resolveUnifiedLedgerFinancialTotals,
    storageKey,
} from '@/app/slices/financial/ledgerPublic';
import {
    resolveSettlementDuePhase,
    type SettlementDuePhase,
} from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import { coalesceDecisionsStorageExecutionId } from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import type { ExecutionSparkRuntimeOverlay } from '@/app/spark/context/executionSparkRuntimeOverlay';
import { parseYmdToTs } from '@/app/services/executionAlerts.helpers';
import { storageCache } from '@/app/utils/storageCache';
import { hasOngoingAlimonyInExecution } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
import { resolveOngoingAlimonyMonthlyDisplay } from '@/app/utils/alimonyBeneficiaryDeathUtils';
import { resolvePrimaryExecutionClaimType } from '@/app/utils/executionClaimIsolation';

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_PAYMENT_DAYS = 60;
const INSTALLMENT_DUE_SOON_DAYS = 3;

export type ExecutionFinancialSparkSignals = {
    ledgerRemainingIqd: number | null;
    effectiveRemainingIqd: number;
    hasLedgerData: boolean;
    pendingSettlement: PendingSettlement | null;
    settlementDuePhase: SettlementDuePhase | null;
    settlementBreachTriggeredAt: string | null;
    daysSinceLastLedgerPayment: number | null;
    salaryInstallmentDueYmd: string | null;
    salaryInstallmentAmountIqd: number | null;
    salaryInstallmentDaysUntilDue: number | null;
    isMonetaryClaim: boolean;
    isOngoingAlimonyClaim: boolean;
    ongoingMonthlyAlimonyIqd: number;
    alimonyNeedsMonthlySettlement: boolean;
    alimonyPaidThisMonth: boolean;
    tracksOngoingAlimonySettlement: boolean;
    settlementDaysUntilDue: number | null;
};

function formatLocalYmd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function extractYmd(value: string): string {
    const v = String(value ?? '').trim();
    const m = v.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : '';
}

function resolveFileRemainingIqd(file: ExecutionFile): number {
    const fromField = Number(file.total_remaining_balance ?? file.remainingDebt);
    if (Number.isFinite(fromField) && fromField >= 0) return fromField;
    const debt = Number(file.debtAmount ?? file.totalAmount ?? 0);
    const paid = Number(file.paidDebt ?? file.paidAmount ?? 0);
    return Math.max(0, debt - paid);
}

function resolveIsMonetaryClaim(file: ExecutionFile): boolean {
    const principal = Number(file.debtAmount ?? file.totalAmount ?? 0);
    const fees = Number(file.lawyerFees ?? file.clientFees ?? 0);
    if (principal > 0 || fees > 0) return true;
    const remaining = resolveFileRemainingIqd(file);
    return remaining > 0;
}

/** معاملات وعاء مبسّطة لمسح سبارك — تكفي لقراءة التسوية والمتبقي من التخزين */
export function buildSparkLedgerParamsFromExecutionFile(
    file: ExecutionFile,
    executionId: string,
): UnifiedLedgerTotalParams {
    const record = file as Record<string, unknown>;
    const principal = Math.max(
        0,
        Number(
            record.financialPrincipalAmount ??
                file.debtAmount ??
                file.totalAmount ??
                file.total_remaining_balance ??
                0,
        ) || 0,
    );
    const lawyerFees = Math.max(
        0,
        Number(record.financialLawyerFeesAmount ?? file.lawyerFees ?? file.clientFees ?? file.executionFee ?? 0) ||
            0,
    );
    const execExpenses = Math.max(
        0,
        Number((file as { total_execution_expenses?: number }).total_execution_expenses ?? 0) || 0,
    );
    const evictionWaived = Boolean(
        (file as { eviction_lawyer_fee_waived_at_intake?: boolean }).eviction_lawyer_fee_waived_at_intake,
    );
    return {
        principal_amount: principal,
        courtOrderedFeesSafe: lawyerFees,
        evictionLawyerFeeWaivedAtIntake: evictionWaived,
        executionExpensesSumSafe: execExpenses,
        evictionCaseExpensesSumSafe: 0,
        seedLawyerId: executionId ? `seed-lawyer-${executionId}` : '',
        seedExpenseId: executionId ? `seed-exp-${executionId}` : '',
    };
}

function resolveLastLedgerPaymentYmd(
    payments: Array<{ at?: string; entryType?: string }>,
): string | null {
    let best: string | null = null;
    for (const row of payments) {
        const et = String(row.entryType ?? 'collect');
        if (et === 'disburse') continue;
        const ymd = extractYmd(String(row.at ?? ''));
        if (!ymd) continue;
        if (!best || ymd > best) best = ymd;
    }
    return best;
}

function buildMonthlyDueYmd(anchorYmd: string, refYmd: string): string | null {
    const anchor = extractYmd(anchorYmd);
    const ref = extractYmd(refYmd);
    if (!anchor || !ref) return null;
    const [, , anchorDay] = anchor.split('-').map((x) => Number(x));
    const [refY, refM] = ref.split('-').map((x) => Number(x));
    if (!Number.isFinite(refY) || !Number.isFinite(refM) || !Number.isFinite(anchorDay)) return null;
    const due = new Date(refY, refM - 1, anchorDay, 12, 0, 0);
    if (!Number.isFinite(due.getTime())) return null;
    return formatLocalYmd(due);
}

function diffDaysYmd(fromYmd: string, toYmd: string): number | null {
    const a = parseYmdToTs(fromYmd);
    const b = parseYmdToTs(toYmd);
    if (a == null || b == null) return null;
    return Math.floor((b - a) / DAY_MS);
}

function resolveSalaryInstallmentSignal(
    file: ExecutionFile,
    todayYmd: string,
): {
    dueYmd: string | null;
    amountIqd: number | null;
    daysUntilDue: number | null;
} {
    const sched = file.salary_garnishment_installment_schedule as
        | Record<string, unknown>
        | null
        | undefined;
    if (!sched || typeof sched !== 'object') {
        return { dueYmd: null, amountIqd: null, daysUntilDue: null };
    }
    const startDate = String(sched.startDate ?? sched.start_date ?? '').trim();
    const amountIqd = Math.max(
        0,
        Math.round(Number(sched.monthlyAmountIqd ?? sched.monthly_amount_iqd ?? 0) || 0),
    );
    if (!startDate || amountIqd <= 0) {
        return { dueYmd: null, amountIqd: null, daysUntilDue: null };
    }
    const dueYmd = buildMonthlyDueYmd(startDate, todayYmd);
    if (!dueYmd) return { dueYmd: null, amountIqd: null, daysUntilDue: null };
    const daysUntilDue = diffDaysYmd(todayYmd, dueYmd);
    return { dueYmd, amountIqd, daysUntilDue };
}

function resolveAlimonyPaidThisMonth(
    payments: Array<{ at?: string; amount?: number; entryType?: string }>,
    monthPrefix: string,
    monthlyIqd: number,
): boolean {
    if (!monthPrefix || monthlyIqd <= 0) return false;
    let sum = 0;
    for (const row of payments) {
        const ymd = extractYmd(String(row.at ?? ''));
        if (!ymd.startsWith(monthPrefix)) continue;
        const et = String(row.entryType ?? 'collect');
        if (et === 'disburse') continue;
        sum += Math.max(0, Math.round(Number(row.amount) || 0));
    }
    return sum >= monthlyIqd;
}

function defaultReadRaw(key: string): unknown {
    try {
        return storageCache.get(key);
    } catch {
        return undefined;
    }
}

export function resolveExecutionFinancialSparkSignals(params: {
    file: ExecutionFile;
    decisionsStorageExecutionId?: string;
    runtimeOverlay?: ExecutionSparkRuntimeOverlay;
    readRaw?: (key: string) => unknown;
    todayYmd?: string;
}): ExecutionFinancialSparkSignals {
    const file = params.file;
    const fileRemaining = resolveFileRemainingIqd(file);
    const isMonetaryClaim = resolveIsMonetaryClaim(file);
    const todayYmd = params.todayYmd ?? formatLocalYmd(new Date());
    const readRaw = params.readRaw ?? defaultReadRaw;

    const executionId = coalesceDecisionsStorageExecutionId({
        decisionsStorageExecutionId: params.decisionsStorageExecutionId,
        executionId: String(file.id ?? ''),
        executionData: file as Record<string, unknown>,
    });

    const overlayFinancial = params.runtimeOverlay?.financial;
    let ledgerRemainingIqd: number | null = null;
    let hasLedgerData = false;
    let pendingSettlement: PendingSettlement | null = null;
    let settlementBreachTriggeredAt: string | null = null;
    let daysSinceLastLedgerPayment: number | null = null;
    let ledgerPayments: Array<{ at?: string; amount?: number; entryType?: string }> = [];

    if (overlayFinancial) {
        if (typeof overlayFinancial.ledgerRemainingIqd === 'number') {
            ledgerRemainingIqd = Math.max(0, Math.round(overlayFinancial.ledgerRemainingIqd));
            hasLedgerData = true;
        }
        if (overlayFinancial.pendingSettlement !== undefined) {
            pendingSettlement = overlayFinancial.pendingSettlement;
            hasLedgerData = hasLedgerData || pendingSettlement != null;
        }
        if (overlayFinancial.settlementBreachTriggeredAt !== undefined) {
            settlementBreachTriggeredAt = overlayFinancial.settlementBreachTriggeredAt;
            hasLedgerData = hasLedgerData || Boolean(settlementBreachTriggeredAt);
        }
        if (typeof overlayFinancial.daysSinceLastLedgerPayment === 'number') {
            daysSinceLastLedgerPayment = overlayFinancial.daysSinceLastLedgerPayment;
        }
    }

    if (executionId && isMonetaryClaim) {
        const ledgerParams = buildSparkLedgerParamsFromExecutionFile(file, executionId);
        const totals = resolveUnifiedLedgerFinancialTotals(executionId, ledgerParams, readRaw);
        const gate = resolveSettlementGuarantorGateFromLedger({ executionId, readRaw });
        const raw = readRaw(storageKey(executionId));
        const store = parseUnifiedLedgerFromStorage(raw);

        if (store && (store.seeded || store.payments.length > 0 || store.pendingSettlement)) {
            hasLedgerData = true;
        }

        if (ledgerRemainingIqd == null) {
            ledgerRemainingIqd = totals.remainingUnified;
        }

        if (pendingSettlement === null && gate.pendingSettlement) {
            pendingSettlement = gate.pendingSettlement;
        }
        if (!settlementBreachTriggeredAt && gate.settlementBreachTriggeredAt) {
            settlementBreachTriggeredAt = gate.settlementBreachTriggeredAt;
        }

        if (daysSinceLastLedgerPayment == null && store?.payments?.length) {
            ledgerPayments = store.payments;
            const lastPayYmd = resolveLastLedgerPaymentYmd(store.payments);
            if (lastPayYmd) {
                const days = diffDaysYmd(lastPayYmd, todayYmd);
                if (days != null && days >= 0) daysSinceLastLedgerPayment = days;
            }
        }
    }

    const effectiveRemainingIqd =
        ledgerRemainingIqd != null && hasLedgerData ? ledgerRemainingIqd : fileRemaining;

    let settlementDuePhase: SettlementDuePhase | null = null;
    let settlementDaysUntilDue: number | null = null;
    if (pendingSettlement?.dueDate) {
        settlementDuePhase = resolveSettlementDuePhase(pendingSettlement.dueDate, todayYmd);
        settlementDaysUntilDue = diffDaysYmd(todayYmd, pendingSettlement.dueDate);
    }

    const installment = resolveSalaryInstallmentSignal(file, todayYmd);

    const primaryClaim = resolvePrimaryExecutionClaimType(file as Record<string, unknown>);
    const isOngoingAlimonyClaim = hasOngoingAlimonyInExecution(
        file as Record<string, unknown>,
        primaryClaim,
    );
    const ongoingMonthlyAlimonyIqd = isOngoingAlimonyClaim
        ? Math.max(0, Math.round(resolveOngoingAlimonyMonthlyDisplay(file).total))
        : 0;
    const tracksOngoingAlimonySettlement = Boolean(
        pendingSettlement?.tracksOngoingAlimony ||
            (isOngoingAlimonyClaim && ongoingMonthlyAlimonyIqd > 0 && pendingSettlement != null),
    );
    const monthPrefix = todayYmd.slice(0, 7);
    const alimonyPaidThisMonth = resolveAlimonyPaidThisMonth(
        ledgerPayments,
        monthPrefix,
        pendingSettlement?.tracksOngoingAlimony
            ? Math.max(ongoingMonthlyAlimonyIqd, Math.round(Number(pendingSettlement?.amount) || 0))
            : ongoingMonthlyAlimonyIqd,
    );
    const alimonyNeedsMonthlySettlement =
        isOngoingAlimonyClaim &&
        ongoingMonthlyAlimonyIqd > 0 &&
        !pendingSettlement &&
        !settlementBreachTriggeredAt &&
        !alimonyPaidThisMonth;

    return {
        ledgerRemainingIqd,
        effectiveRemainingIqd,
        hasLedgerData,
        pendingSettlement,
        settlementDuePhase,
        settlementBreachTriggeredAt,
        daysSinceLastLedgerPayment,
        salaryInstallmentDueYmd: installment.dueYmd,
        salaryInstallmentAmountIqd: installment.amountIqd,
        salaryInstallmentDaysUntilDue: installment.daysUntilDue,
        isMonetaryClaim,
        isOngoingAlimonyClaim,
        ongoingMonthlyAlimonyIqd,
        alimonyNeedsMonthlySettlement,
        alimonyPaidThisMonth,
        tracksOngoingAlimonySettlement,
        settlementDaysUntilDue,
    };
}

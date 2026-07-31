// @ts-nocheck
import {
    getExecutionModuleStrategy,
    isEvictionClaim,
} from '@/app/utils/executionModuleStrategies';
import { parseLooseAmountFromText } from '@/app/utils/looseAmountParse';
import { storageCache } from '@/app/utils/storageCache';
import SecureStoreService from '@/app/services/SecureStoreService';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import {
    parseUnifiedLedgerFromStorage,
    resolveUnifiedLedgerFinancialTotals,
    storageKey,
    type UnifiedLedgerTotalParams,
} from '@/app/components/lawyer/FinancialOperationsCenter/utils';
import type { LooseArchiveFile } from './types';
import { executionTotalDemandEstimate, parseLooseAmount } from './archivePortalAmountUtils';

const NON_FINANCIAL_CLAIMS = [
    'مشاهدة',
    'استصحاب',
    'مبيت',
    'تخلية مأجور',
    'مطاوعة',
    'تسليم طفل',
    'تسليم ولد',
];

function parseArchivePrincipalDebt(loose: LooseArchiveFile): number {
    const d = loose as Record<string, unknown>;
    const primary = Array.isArray(d.debtors) ? (d.debtors as Array<Record<string, unknown>>) : [];
    const additional = Array.isArray((d.party_multiplicity as Record<string, unknown> | undefined)?.additionalDebtors)
        ? ((d.party_multiplicity as Record<string, unknown>).additionalDebtors as Array<Record<string, unknown>>)
        : [];
    const allocatedSum = [...primary, ...additional].reduce((t, row) => {
        const n = parseLooseAmountFromText(row?.allocated_debt);
        return t + (Number.isFinite(n) ? Math.max(0, n) : 0);
    }, 0);

    const candidates: unknown[] = [
        d.totalAmount,
        d.debtAmount,
        allocatedSum,
        d.total_remaining_balance,
        d.remainingDebt,
        d.amount,
    ];
    for (const c of candidates) {
        const n = parseLooseAmount(c);
        if (n > 0) return n;
    }
    return 0;
}

function sumEvictionCaseExpenses(loose: LooseArchiveFile): number {
    const rows = (loose as { eviction_case_expenses?: unknown }).eviction_case_expenses;
    if (!Array.isArray(rows)) return 0;
    return rows.reduce((s, row) => {
        const item = row as { amount?: unknown };
        return s + parseLooseAmount(item?.amount);
    }, 0);
}

function sumJudicialCustodianSalaries(loose: LooseArchiveFile): number {
    const d = loose as Record<string, unknown>;
    const arr = d.eviction_judicial_custodians;
    if (Array.isArray(arr) && arr.length > 0) {
        return arr.reduce((t, row) => {
            const item = row as { salary?: unknown };
            return t + parseLooseAmountFromText(item?.salary);
        }, 0);
    }
    const leg = d.eviction_judicial_custodian as { salary?: unknown } | undefined;
    return leg ? parseLooseAmountFromText(leg.salary) : 0;
}

export function buildArchiveLedgerParams(
    snap: ExecutionFile,
    loose: LooseArchiveFile
): UnifiedLedgerTotalParams {
    const exId = String(snap.id ?? '').trim();
    const claimType = String(snap.claimType || '').trim();
    const isEvictionModule = isEvictionClaim(claimType) || getExecutionModuleStrategy(claimType).useEvictionFieldProcedures;
    const isNonFinancial =
        NON_FINANCIAL_CLAIMS.some((t) => claimType.includes(t)) || isEvictionClaim(claimType);
    const principal_amount = isNonFinancial ? 0 : parseArchivePrincipalDebt(loose);

    const parsedLawyerFees = Math.max(
        parseLooseAmount((loose as { lawyerFeesAmount?: unknown }).lawyerFeesAmount),
        parseLooseAmount((loose as { executionFee?: unknown }).executionFee)
    );
    const courtFees = parseLooseAmount((loose as { courtFees?: unknown }).courtFees);
    const directorateFees = parseLooseAmount((loose as { directorateFees?: unknown }).directorateFees);
    const executionExpensesSumSafe = courtFees + directorateFees;
    const evictionCaseExpensesSumSafe = isEvictionModule
        ? sumEvictionCaseExpenses(loose) + sumJudicialCustodianSalaries(loose)
        : 0;

    const evictionLawyerFeeWaivedAtIntake = isEvictionModule
        ? !(loose as { eviction_initial_notice_lawyer_fees_included?: boolean }).eviction_initial_notice_lawyer_fees_included
        : Boolean((loose as { eviction_lawyer_fee_waived_at_intake?: boolean }).eviction_lawyer_fee_waived_at_intake);

    const courtOrderedFeesSafe = isEvictionModule
        ? (loose as { eviction_initial_notice_lawyer_fees_included?: boolean }).eviction_initial_notice_lawyer_fees_included === true
            ? Math.max(0, parsedLawyerFees)
            : 0
        : Math.max(0, parsedLawyerFees);

    return {
        principal_amount,
        courtOrderedFeesSafe,
        evictionLawyerFeeWaivedAtIntake,
        executionExpensesSumSafe: Math.max(0, executionExpensesSumSafe),
        evictionCaseExpensesSumSafe: Math.max(0, evictionCaseExpensesSumSafe),
        seedLawyerId: exId ? `seed-lawyer-${exId}` : '',
        seedExpenseId: exId ? `seed-exp-${exId}` : '',
    };
}

export function readArchiveLedgerRaw(executionId: string): unknown {
    if (!executionId) return undefined;
    try {
        const cached = storageCache.get(storageKey(executionId));
        if (cached !== undefined && cached !== null) return cached;
    } catch {
        /* ignore */
    }
    try {
        const raw = SecureStoreService.getItemSync(storageKey(executionId));
        if (!raw) return undefined;
        return JSON.parse(raw) as unknown;
    } catch {
        return undefined;
    }
}

export type ArchiveFinancialDemand = {
    totalDemand: number;
    remainingDemand: number;
    demandLabel: string;
    secondaryDemandLabel: string | null;
    syncedFromLedger: boolean;
};

export function resolveExecutionArchiveFinancialDemand(
    snap: ExecutionFile,
    loose: LooseArchiveFile,
    unifiedMeta?: { unifiedCount?: number; unifiedTotalDemand?: number }
): ArchiveFinancialDemand {
    const unifiedCount = Number(unifiedMeta?.unifiedCount || 0);
    const unifiedTotalDemandRaw = Number(unifiedMeta?.unifiedTotalDemand);
    if (unifiedCount > 0 && Number.isFinite(unifiedTotalDemandRaw) && unifiedTotalDemandRaw > 0) {
        return {
            totalDemand: unifiedTotalDemandRaw,
            remainingDemand: unifiedTotalDemandRaw,
            demandLabel: 'إجمالي المطلوب (بعد التوحيد)',
            secondaryDemandLabel: null,
            syncedFromLedger: true,
        };
    }

    const baseEstimate = executionTotalDemandEstimate(loose);
    const exId = String(snap.id ?? '').trim();
    if (!exId) {
        return {
            totalDemand: baseEstimate,
            remainingDemand: baseEstimate,
            demandLabel: 'إجمالي المطلوب (تقدير)',
            secondaryDemandLabel: null,
            syncedFromLedger: false,
        };
    }

    const params = buildArchiveLedgerParams(snap, loose);
    const readRaw = (key: string): unknown => {
        try {
            const cached = storageCache.get(key);
            if (cached !== undefined && cached !== null) return cached;
        } catch {
            /* ignore */
        }
        try {
            const raw = SecureStoreService.getItemSync(key);
            if (!raw) return undefined;
            return JSON.parse(raw) as unknown;
        } catch {
            return undefined;
        }
    };
    const ledgerRaw = readRaw(storageKey(exId));
    const store = parseUnifiedLedgerFromStorage(ledgerRaw);
    const hasLedger =
        Boolean(store) &&
        (store!.seeded ||
            store!.lawyerFees.length > 0 ||
            store!.expenses.length > 0 ||
            store!.payments.length > 0 ||
            store!.collectionRequestActive ||
            typeof store!.principalSnapshot === 'number');

    const { totalOwedUnified, remainingUnified } = resolveUnifiedLedgerFinancialTotals(
        exId,
        params,
        () => ledgerRaw
    );

    if (hasLedger) {
        const hasPayments = remainingUnified < totalOwedUnified;
        return {
            totalDemand: Math.max(0, Math.round(totalOwedUnified)),
            remainingDemand: Math.max(0, Math.round(remainingUnified)),
            demandLabel: hasPayments ? 'متبقي الوعاء' : 'إجمالي الوعاء',
            secondaryDemandLabel: hasPayments
                ? `الإجمالي: ${Math.max(0, Math.round(totalOwedUnified)).toLocaleString('ar-IQ')} د.ع`
                : null,
            syncedFromLedger: true,
        };
    }

    return {
        totalDemand: baseEstimate,
        remainingDemand: baseEstimate,
        demandLabel: 'إجمالي المطلوب (تقدير)',
        secondaryDemandLabel: null,
        syncedFromLedger: false,
    };
}

export function formatArchiveExecutionStatusLabel(status: string | undefined): string {
    const s = String(status || '').trim();
    if (!s || s === 'active') return '';
    if (s === 'paused') return 'موقوف';
    if (s === 'archived' || s === 'archived_stage') return 'مؤرشف';
    if (s === 'deleted') return 'محذوف';
    if (s.includes('متلكئ')) return 'متلكئ';
    if (s.includes('بانتظار')) return 'بانتظار';
    if (s.includes('منتهية') || s.includes('منجز')) return 'منتهية';
    return s;
}

import { describe, expect, it } from 'vitest';
import type { ExecutionFile } from '@/app/types/execution';
import { unifiedFundsLedgerStorageKey } from '@/app/utils/unifiedFundsLedgerStorage';
import {
    buildSparkLedgerParamsFromExecutionFile,
    resolveExecutionFinancialSparkSignals,
} from '@/app/spark/engine/executionFinancialSparkBridge';
import { buildExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import { collectExecutionFinancialSparkNudges } from '@/app/spark/procedural/executionFinancialSparkRules';
import { collectAllExecutionSparkNudges } from '@/app/spark/engine/collectAllExecutionSparkNudges';

function baseFile(overrides: Partial<ExecutionFile> = {}): ExecutionFile {
    return {
        id: 'exec-fin-1',
        directorate: 'بغداد',
        fileNumber: '200/2026',
        executionDate: '2026-01-01',
        submissionDate: '2026-01-01',
        claimType: 'استحصال دين مالي',
        documentType: 'حكم',
        documentDate: '2025-12-01',
        creditors: [{ name: 'موكل', isClient: true }],
        debtors: [{ id: 'd1', name: 'أحمد' }],
        debtAmount: 2_000_000,
        currency: 'IQD',
        courtFees: 0,
        directorateFees: 0,
        lawyerFees: 0,
        clientFees: 0,
        executionFee: 0,
        paidDebt: 0,
        status: 'READY_FOR_COERCIVE',
        isPaused: false,
        timelineEvents: [],
        dossier_lifecycle_status: 'active',
        debtorNotificationDate: '2026-01-01',
        execution_memo_anchor_date: '2026-01-01',
        notificationCount: 1,
        ...overrides,
    } as ExecutionFile;
}

function seedLedger(executionId: string, store: Record<string, unknown>) {
    const key = unifiedFundsLedgerStorageKey(executionId);
    const map = new Map<string, unknown>();
    map.set(key, store);
    return (k: string) => map.get(k);
}

describe('executionFinancialSparkBridge', () => {
    it('يبني معاملات وعاء من حقول الإضبارة', () => {
        const params = buildSparkLedgerParamsFromExecutionFile(baseFile(), 'exec-fin-1');
        expect(params.principal_amount).toBe(2_000_000);
        expect(params.seedLawyerId).toBe('seed-lawyer-exec-fin-1');
    });

    it('يقرأ تسوية معلّقة وموعدها من الوعاء الموحّد', () => {
        const readRaw = seedLedger('exec-fin-1', {
            seeded: true,
            lawyerFees: [],
            expenses: [],
            payments: [],
            completed: false,
            garnishment: false,
            principalSnapshot: 2_000_000,
            pendingSettlement: {
                id: 'set-1',
                amount: 500_000,
                dueDate: '2026-08-05',
                createdAt: '2026-07-01',
            },
            settlementBreachTriggeredAt: null,
        });

        const signals = resolveExecutionFinancialSparkSignals({
            file: baseFile(),
            decisionsStorageExecutionId: 'exec-fin-1',
            readRaw,
            todayYmd: '2026-08-05',
        });

        expect(signals.hasLedgerData).toBe(true);
        expect(signals.pendingSettlement?.amount).toBe(500_000);
        expect(signals.settlementDuePhase).toBe('due');
    });

    it('يكتشف إخلال التسوية', () => {
        const readRaw = seedLedger('exec-fin-1', {
            seeded: true,
            lawyerFees: [],
            expenses: [],
            payments: [{ id: 'p1', amount: 100_000, at: '2026-01-15', kind: 'partial', balanceAfter: 1_900_000 }],
            completed: false,
            garnishment: false,
            principalSnapshot: 2_000_000,
            pendingSettlement: null,
            settlementBreachTriggeredAt: '2026-08-01T10:00:00.000Z',
        });

        const signals = resolveExecutionFinancialSparkSignals({
            file: baseFile(),
            decisionsStorageExecutionId: 'exec-fin-1',
            readRaw,
            todayYmd: '2026-08-05',
        });

        expect(signals.settlementBreachTriggeredAt).toBeTruthy();
        expect(signals.ledgerRemainingIqd).toBeGreaterThan(0);
    });

    it('يولّد تنبيه تسوية متأخرة ويفتح المركز المالي', () => {
        const readRaw = seedLedger('exec-fin-1', {
            seeded: true,
            lawyerFees: [],
            expenses: [],
            payments: [],
            completed: false,
            garnishment: false,
            principalSnapshot: 2_000_000,
            pendingSettlement: {
                id: 'set-2',
                amount: 300_000,
                dueDate: '2026-08-01',
                createdAt: '2026-07-01',
            },
            settlementBreachTriggeredAt: null,
        });

        const ctx = buildExecutionSparkContext({
            executionData: baseFile(),
            decisionsStorageExecutionId: 'exec-fin-1',
        });

        const patched = {
            ...ctx,
            financialSignals: resolveExecutionFinancialSparkSignals({
                file: baseFile(),
                decisionsStorageExecutionId: 'exec-fin-1',
                readRaw,
                todayYmd: '2026-08-05',
            }),
        };

        const nudges = collectExecutionFinancialSparkNudges(patched);
        const overdue = nudges.find((n) => n.kind === 'execution.financial_settlement_overdue');
        expect(overdue).toBeTruthy();
        expect(overdue?.action?.actionId).toBe('open_financial_center');
    });

    it('يستبدل تنبيه الدفعات الراكدة القديم عند وجود وعاء مالي', () => {
        const readRaw = seedLedger('exec-fin-1', {
            seeded: true,
            lawyerFees: [],
            expenses: [],
            payments: [{ id: 'p1', amount: 50_000, at: '2026-01-01', kind: 'partial', balanceAfter: 1_950_000 }],
            completed: false,
            garnishment: false,
            principalSnapshot: 2_000_000,
            pendingSettlement: null,
            settlementBreachTriggeredAt: null,
        });

        const file = baseFile({
            lastPaymentDate: '2026-01-01',
            total_remaining_balance: 1_950_000,
        });

        const ctx = buildExecutionSparkContext({
            executionData: file,
            decisionsStorageExecutionId: 'exec-fin-1',
        });

        const patched = {
            ...ctx,
            financialSignals: resolveExecutionFinancialSparkSignals({
                file,
                decisionsStorageExecutionId: 'exec-fin-1',
                readRaw,
                todayYmd: '2026-08-05',
            }),
        };

        const all = collectAllExecutionSparkNudges(patched);
        expect(all.some((n) => n.kind === 'execution.financial_stale_payments')).toBe(true);
        expect(all.some((n) => n.kind === 'execution.stale_payments')).toBe(false);
    });

    it('يكتشف قسط حجز الراتب المتأخر', () => {
        const ctx = buildExecutionSparkContext({
            executionData: baseFile({
                salary_garnishment_installment_schedule: {
                    monthlyAmountIqd: 200_000,
                    startDate: '2026-01-15',
                    createdAt: '2026-01-01',
                },
            }),
            decisionsStorageExecutionId: 'exec-fin-1',
        });

        const patched = {
            ...ctx,
            financialSignals: resolveExecutionFinancialSparkSignals({
                file: baseFile({
                    salary_garnishment_installment_schedule: {
                        monthlyAmountIqd: 200_000,
                        startDate: '2026-01-15',
                        createdAt: '2026-01-01',
                    },
                }),
                decisionsStorageExecutionId: 'exec-fin-1',
                todayYmd: '2026-08-20',
            }),
        };

        const nudges = collectExecutionFinancialSparkNudges(patched);
        expect(nudges.some((n) => n.kind === 'execution.financial_installment_overdue')).toBe(true);
    });

    it('ينبّه عند غياب تسوية نفقة شهرية', () => {
        const file = baseFile({
            claimType: 'نفقة',
            claimTypes: ['نفقة'],
            monthlyWifeAlimony: 250_000,
            monthly_wife_alimony: 250_000,
            debtAmount: 1_000_000,
        });

        const signals = resolveExecutionFinancialSparkSignals({
            file,
            decisionsStorageExecutionId: 'exec-fin-1',
            readRaw: () => undefined,
            todayYmd: '2026-08-05',
        });

        expect(signals.isOngoingAlimonyClaim).toBe(true);
        expect(signals.ongoingMonthlyAlimonyIqd).toBeGreaterThan(0);
        expect(signals.alimonyNeedsMonthlySettlement).toBe(true);

        const ctx = buildExecutionSparkContext({
            executionData: file,
            decisionsStorageExecutionId: 'exec-fin-1',
        });
        const patched = { ...ctx, financialSignals: signals };
        const nudges = collectExecutionFinancialSparkNudges(patched);
        expect(nudges.some((n) => n.kind === 'execution.financial_alimony_monthly_setup')).toBe(true);
    });

    it('يستخدم overlay لحظي من لوحة التنفيذ', () => {
        const signals = resolveExecutionFinancialSparkSignals({
            file: baseFile(),
            decisionsStorageExecutionId: 'exec-fin-1',
            runtimeOverlay: {
                financial: {
                    ledgerRemainingIqd: 1_250_000,
                    pendingSettlement: {
                        id: 's1',
                        amount: 400_000,
                        dueDate: '2026-08-10',
                        createdAt: '2026-08-01',
                        tracksOngoingAlimony: true,
                    },
                    settlementBreachTriggeredAt: null,
                },
            },
            todayYmd: '2026-08-05',
        });

        expect(signals.ledgerRemainingIqd).toBe(1_250_000);
        expect(signals.tracksOngoingAlimonySettlement).toBe(true);
        expect(signals.settlementDaysUntilDue).toBe(5);
    });
});

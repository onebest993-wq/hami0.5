import { describe, expect, it, vi, beforeEach } from 'vitest';

const hasApprovedUnifiedCollectionMock = vi.fn(() => false);

vi.mock('@/app/utils/executorDecisionReadQueries', () => ({
    hasApprovedUnifiedCollection: (...args: unknown[]) => hasApprovedUnifiedCollectionMock(...args),
}));

import { buildSubsequentNoticeSparkBundle } from '@/app/spark/engine/buildSubsequentNoticePolicyInputFromFile';
import type { ExecutionFile } from '@/app/types/execution';

function baseFile(overrides: Partial<ExecutionFile> = {}): ExecutionFile {
    return {
        id: 'exec-gov',
        directorate: 'بغداد',
        fileNumber: '200/2026',
        executionDate: '2026-01-01',
        submissionDate: '2026-01-01',
        claimType: 'نفقة',
        documentType: 'حكم',
        documentDate: '2025-12-01',
        creditors: [{ name: 'موكل', isClient: true }],
        debtors: [{ id: 'd1', name: 'موظف', occupation: 'موظف حكومي', isGovernmentEmployee: true }],
        debtAmount: 500_000,
        currency: 'IQD',
        courtFees: 0,
        directorateFees: 0,
        lawyerFees: 0,
        clientFees: 0,
        executionFee: 0,
        paidDebt: 0,
        status: 'GRACE_PERIOD',
        isPaused: false,
        timelineEvents: [],
        dossier_lifecycle_status: 'active',
        debtorNotificationDate: '2020-01-01',
        execution_memo_anchor_date: '2020-01-01',
        notificationCount: 2,
        activeCoerciveActions: ['salary'],
        ...overrides,
    } as ExecutionFile;
}

describe('buildSubsequentNoticeSparkBundle', () => {
    beforeEach(() => {
        hasApprovedUnifiedCollectionMock.mockReturnValue(false);
    });

    it('يكتشف مسار employee_monetary لموظف حكومي + نفقة', () => {
        const bundle = buildSubsequentNoticeSparkBundle(baseFile());
        expect(bundle.debtorSummonsProfile).toBe('employee_monetary');
        expect(bundle.employeeFinancialSalaryOnlyCoercive).toBe(true);
        expect(bundle.subsequentNoticeUnlocked).toBe(true);
    });

    it('يفتح التبليغ اللاحق عبر حجز الراتب دون إعلان انتهاء المهلة', () => {
        const bundle = buildSubsequentNoticeSparkBundle(
            baseFile({
                notice_voluntary_period_end_declared: false,
                notificationCount: 2,
                activeCoerciveActions: ['salary'],
            }),
        );
        expect(bundle.subsequentNoticeUnlocked).toBe(true);
    });

    it('يكتشف تكليف موظف نشط من الحقول المخزّنة', () => {
        const bundle = buildSubsequentNoticeSparkBundle(
            baseFile({
                employee_summons_assignments_by_debtor: {
                    d1: { phase: 'active', assignedAt: '2026-01-01' },
                },
            }),
        );
        expect(bundle.primaryDebtorTaklifActive).toBe(true);
    });

    it('يقرأ unifiedCollectionApproved من قرارات المنفذ المخزّنة', () => {
        hasApprovedUnifiedCollectionMock.mockReturnValue(true);
        buildSubsequentNoticeSparkBundle(baseFile(), undefined, 'exec-gov');
        expect(hasApprovedUnifiedCollectionMock).toHaveBeenCalledWith('exec-gov');
    });
});

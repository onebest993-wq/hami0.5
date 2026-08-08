import { describe, expect, it } from 'vitest';
import { deriveExecutionAttentionSignals } from '@/app/spark/engine/executionAttentionSignals';
import { buildExecutionSparkRuntimeOverlayFromFile } from '@/app/spark/context/executionSparkRuntimeOverlay';
import { buildExecutionSparkContextFromArchiveFile } from '@/app/spark/context/executionSparkContextFromFile';
import { collectAllExecutionSparkNudges } from '@/app/spark/engine/collectAllExecutionSparkNudges';
import type { ExecutionFile } from '@/app/types/execution';

function baseFile(overrides: Partial<ExecutionFile> = {}): ExecutionFile {
    return {
        id: 'exec-1',
        directorate: 'بغداد',
        fileNumber: '100/2026',
        executionDate: '2026-01-01',
        submissionDate: '2026-01-01',
        claimType: 'استحصال دين مالي',
        documentType: 'حكم',
        documentDate: '2025-12-01',
        creditors: [{ name: 'موكل', isClient: true }],
        debtors: [{ id: 'd1', name: 'أحمد' }],
        debtAmount: 1_000_000,
        currency: 'IQD',
        courtFees: 0,
        directorateFees: 0,
        lawyerFees: 0,
        clientFees: 0,
        executionFee: 0,
        paidDebt: 0,
        status: 'UNNOTIFIED',
        isPaused: false,
        timelineEvents: [],
        dossier_lifecycle_status: 'active',
        ...overrides,
    } as ExecutionFile;
}

describe('executionAttentionSignals', () => {
    it('يكتشف غير مبلّغ عند غياب تاريخ الإخبار', () => {
        const signals = deriveExecutionAttentionSignals(baseFile());
        expect(signals.globalStatus).toBe('UNNOTIFIED');
        expect(signals.showUnservedMemo).toBe(true);
    });

    it('يميّز مسار الإخلاء', () => {
        const signals = deriveExecutionAttentionSignals(
            baseFile({
                claimType: 'تخلية مأجور',
                eviction_first_notice_date: '2020-01-01',
            }),
        );
        expect(signals.isEvictionModule).toBe(true);
        expect(signals.evictionVoluntaryGap).not.toBeNull();
    });

    it('يقرأ مهلة عاجلة من السجل الزمني', () => {
        const today = new Date();
        const deadline = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3);
        const y = deadline.getFullYear();
        const m = String(deadline.getMonth() + 1).padStart(2, '0');
        const d = String(deadline.getDate()).padStart(2, '0');
        const signals = deriveExecutionAttentionSignals(
            baseFile({
                debtorNotificationDate: '2026-01-01',
                execution_memo_anchor_date: '2026-01-01',
                notificationCount: 1,
                timelineEvents: [
                    {
                        id: 't1',
                        type: 'deadline',
                        title: 'مهلة تقديم طلب',
                        date: '2026-01-10',
                        deadlineDate: `${y}-${m}-${d}`,
                    },
                ],
            }),
        );
        expect(signals.urgentTimelineDeadline).not.toBeNull();
        expect(signals.urgentTimelineDeadline?.title).toContain('مهلة');
    });

    it('يكتشف جولة التبليغ الثانية من حقول الإضبارة', () => {
        const signals = deriveExecutionAttentionSignals(
            baseFile({
                debtorNotificationDate: '2020-01-01',
                execution_memo_anchor_date: '2020-01-01',
                notice_voluntary_period_end_declared: true,
                notificationCount: 1,
                summoningRound: 1,
                forcedAttendanceIssued: false,
            }),
        );
        expect(signals.subsequentSummonsDue).toBe(true);
    });

    it('لا يقترح جولة تبليغ ثانية لمسار موظف حكومي', () => {
        const signals = deriveExecutionAttentionSignals(
            baseFile({
                debtorNotificationDate: '2020-01-01',
                execution_memo_anchor_date: '2020-01-01',
                notice_voluntary_period_end_declared: true,
                notificationCount: 1,
                summoningRound: 1,
                debtors: [{ id: 'd1', name: 'موظف', occupation: 'موظف حكومي', isGovernmentEmployee: true }],
                claimType: 'نفقة',
            }),
        );
        expect(signals.debtorSummonsProfile).toBe('employee_monetary');
        expect(signals.subsequentSummonsDue).toBe(false);
    });

    it('يبني overlay من ملف الأرشيف', () => {
        const overlay = buildExecutionSparkRuntimeOverlayFromFile({
            activeCoerciveActions: ['salary'],
            notificationCount: 2,
        });
        expect(overlay.activeCoerciveActions).toEqual(['salary']);
        expect(overlay.notificationCount).toBe(2);
    });

    it('يمسح الأرشيف مع إجراءات جبريّة مخزّنة', () => {
        const ctx = buildExecutionSparkContextFromArchiveFile({
            id: 'arch-1',
            dossier_lifecycle_status: 'active',
            debtAmount: 500_000,
            debtorNotificationDate: '2020-01-01',
            execution_memo_anchor_date: '2020-01-01',
            notice_voluntary_period_end_declared: true,
            notificationCount: 2,
            activeCoerciveActions: ['salary'],
            debtors: [{ id: 'd1', name: 'مدين' }],
            timelineEvents: [{ id: 'old', type: 'note', title: 'قديم', date: '2020-01-01' }],
        });
        expect(ctx?.runtimeOverlay?.activeCoerciveActions).toEqual(['salary']);
        const nudges = collectAllExecutionSparkNudges(ctx!, ctx?.runtimeOverlay);
        expect(nudges.some((n) => n.kind === 'execution.coercive_stalled')).toBe(true);
    });
});

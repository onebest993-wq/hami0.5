import { describe, expect, it } from 'vitest';
import { collectExecutionSecretarySparkNudges } from '@/app/spark/engine/executionSecretarySparkBridge';
import { buildExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import { collectExecutionCoerciveSparkNudges } from '@/app/spark/procedural/executionCoerciveSparkRules';
import { collectAllExecutionSparkNudges } from '@/app/spark/engine/collectAllExecutionSparkNudges';
import { pickExecutionSparkNudgeQueue } from '@/app/spark/engine/sparkExecutionEngine';
import type { ExecutionFile } from '@/app/types/execution';

function baseFile(overrides: Partial<ExecutionFile> = {}): ExecutionFile {
    return {
        id: 'exec-sec-1',
        directorate: 'بغداد',
        fileNumber: '200/2026',
        executionDate: '2026-01-01',
        submissionDate: '2026-01-01',
        claimType: 'استحصال دين مالي',
        documentType: 'حكم',
        documentDate: '2025-12-01',
        creditors: [{ name: 'موكل', isClient: true }],
        debtors: [{ id: 'd1', name: 'مدين' }],
        debtAmount: 2_000_000,
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

describe('execution Wave 3 — Secretary + coercive bridge', () => {
    it('يحوّل تنبيه الحبس التنفيذي من Secretary إلى سبارك', () => {
        const file = baseFile({
            debtorNotificationDate: '2026-01-01',
            execution_memo_anchor_date: '2026-01-01',
            notice_voluntary_period_end_declared: true,
            notificationCount: 2,
            executive_detention_until: '2026-08-10',
            executive_detention_reminder_sent: false,
        });

        const nudges = collectExecutionSecretarySparkNudges(file, new Set());
        expect(nudges.some((n) => n.id.includes('detention'))).toBe(true);
        expect(nudges.some((n) => n.kind === 'execution.secretary_deadline')).toBe(true);
    });

    it('يتجنّب تكرار ركود الإضبارة مع القاعدة المحلية', () => {
        const file = baseFile({
            dossier_last_action_date: '2020-01-01',
            debtAmount: 1_000_000,
            debtorNotificationDate: '2026-01-01',
            notificationCount: 1,
        });

        const localKinds = new Set<string>(['execution.dormancy_art112']);
        const nudges = collectExecutionSecretarySparkNudges(file, localKinds);
        expect(nudges.some((n) => n.id.includes('dormancy'))).toBe(false);
    });

    it('ينبّه عند إجراء جبري راكد في السجل', () => {
        const file = baseFile({
            debtorNotificationDate: '2020-01-01',
            execution_memo_anchor_date: '2020-01-01',
            notice_voluntary_period_end_declared: true,
            notificationCount: 2,
            timelineEvents: [
                {
                    id: 'old',
                    type: 'note',
                    title: 'إجراء قديم',
                    date: '2020-01-01',
                },
            ],
        });

        const ctx = buildExecutionSparkContext({
            executionData: file,
            runtimeOverlay: { activeCoerciveActions: ['salary'] },
        });
        const nudges = collectExecutionCoerciveSparkNudges(ctx, {
            activeCoerciveActions: ['salary'],
        });
        expect(nudges.some((n) => n.kind === 'execution.coercive_stalled')).toBe(true);
    });

    it('يجمع المصادر الثلاثة دون تكرار المعرف', () => {
        const file = baseFile();
        const ctx = buildExecutionSparkContext({ executionData: file });
        const merged = collectAllExecutionSparkNudges(ctx);
        const ids = merged.map((n) => n.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(merged.some((n) => n.kind === 'execution.debtor_unnotified')).toBe(true);
    });

    it('يُرجع طابوراً مرتباً بعد كتم التنبيهات', () => {
        const file = baseFile({
            debtAmount: 1_000_000,
            debtorNotificationDate: '2020-01-01',
            execution_memo_anchor_date: '2020-01-01',
            notice_voluntary_period_end_declared: true,
            notificationCount: 2,
            executive_detention_until: '2026-08-10',
            executive_detention_reminder_sent: false,
        });
        const ctx = buildExecutionSparkContext({ executionData: file });
        const queue = pickExecutionSparkNudgeQueue(ctx, 3);
        expect(queue.length).toBeGreaterThanOrEqual(2);
        expect(queue[0]!.priority).toBeLessThanOrEqual(queue[1]!.priority);
    });
});

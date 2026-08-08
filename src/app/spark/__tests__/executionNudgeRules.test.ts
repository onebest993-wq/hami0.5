import { describe, expect, it } from 'vitest';
import { collectExecutionSparkNudges } from '@/app/spark/procedural/executionNudgeRules';
import { buildExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import type { ExecutionFile } from '@/app/types/execution';

function ctx(overrides: Partial<ExecutionFile> = {}, extra?: { executionPaused?: boolean }) {
    const file: ExecutionFile = {
        id: 'exec-1',
        executionCaseNumber: 'EX-10/2026',
        dossier_lifecycle_status: 'active',
        debtors: [{ id: 'd1', name: 'أحمد' }],
        ...overrides,
    };
    return buildExecutionSparkContext({
        executionData: file,
        decisionsStorageExecutionId: String(file.id),
        executionPaused: extra?.executionPaused,
    });
}

describe('executionNudgeRules — Wave 3 + Wave 2', () => {
    it('يقترح تسجيل انتهاء المهلة الرضائية', () => {
        const nudges = collectExecutionSparkNudges(
            ctx({
                execution_memo_anchor_date: '2020-01-01',
                notice_voluntary_period_end_declared: false,
            }),
        );
        expect(nudges.some((n) => n.kind === 'execution.voluntary_period_end')).toBe(true);
    });

    it('يقترح متابعة قرار قاضي الحبس', () => {
        const nudges = collectExecutionSparkNudges(
            ctx({
                executive_detention_judge_eligible_decision_id: 'dec-1',
                executive_detention_judge_outcome: null,
            }),
        );
        expect(nudges.some((n) => n.kind === 'execution.detention_judge_followup')).toBe(true);
    });

    it('يقترح استئناف السير عند إيقاف الإضبارة', () => {
        const nudges = collectExecutionSparkNudges(
            ctx(
                {
                    dossier_lifecycle_status: 'paused',
                    dossier_status_reason: 'وفاة مدين',
                },
                { executionPaused: true },
            ),
        );
        expect(nudges.some((n) => n.kind === 'execution.lifecycle_resume')).toBe(true);
    });

    it('لا يقترح لإضبارة منتهية', () => {
        const nudges = collectExecutionSparkNudges(
            ctx({
                dossier_lifecycle_status: 'finished',
                execution_memo_anchor_date: '2020-01-01',
            }),
        );
        expect(nudges).toHaveLength(0);
    });

    it('ينبّه عند غياب تبليغ المدين', () => {
        const nudges = collectExecutionSparkNudges(ctx());
        expect(nudges.some((n) => n.kind === 'execution.debtor_unnotified')).toBe(true);
    });

    it('ينبّه عند جاهزية التنفيذ الجبري دون إجراء حديث', () => {
        const nudges = collectExecutionSparkNudges(
            ctx({
                debtAmount: 500_000,
                debtorNotificationDate: '2020-01-01',
                execution_memo_anchor_date: '2020-01-01',
                notice_voluntary_period_end_declared: true,
                notificationCount: 1,
            }),
        );
        expect(nudges.some((n) => n.kind === 'execution.ready_for_coercive')).toBe(true);
    });

    it('ينبّه عند مهلة عاجلة في السجل الزمني', () => {
        const today = new Date();
        const deadline = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
        const ymd = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
        const nudges = collectExecutionSparkNudges(
            ctx({
                debtorNotificationDate: '2026-01-01',
                execution_memo_anchor_date: '2026-01-01',
                notificationCount: 1,
                timelineEvents: [
                    {
                        id: 'e1',
                        type: 'task',
                        title: 'تقديم طلب حجز',
                        date: '2026-02-01',
                        deadlineDate: ymd,
                    },
                ],
            }),
        );
        expect(nudges.some((n) => n.kind === 'execution.timeline_urgent_deadline')).toBe(true);
    });
});

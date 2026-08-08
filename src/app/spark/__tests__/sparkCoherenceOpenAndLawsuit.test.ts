import { describe, expect, it } from 'vitest';
import { buildExecutionSparkContext } from '@/app/spark/context/executionSparkContext';
import { buildLawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import { runSparkCoherenceForExecutionOpen } from '@/app/spark/coherence/runSparkCoherenceForExecutionOpen';
import { runSparkCoherenceForLawsuit } from '@/app/spark/coherence/runSparkCoherenceForLawsuit';
import { coherenceReportToSparkNudges } from '@/app/spark/coherence/bridge/coherenceToSparkNudges';
import { pickExecutionSparkNudgeQueue } from '@/app/spark/engine/sparkExecutionEngine';
import { pickLawsuitSparkNudgeQueue } from '@/app/spark/engine/sparkHybridEngine';
import type { ExecutionFile } from '@/app/types/execution';

function baseExecutionFile(overrides: Partial<ExecutionFile> = {}): ExecutionFile {
    return {
        id: 'exec-coherence-1',
        directorate: 'بغداد',
        fileNumber: '300/2026',
        executionDate: '2026-01-01',
        submissionDate: '2026-01-01',
        claimType: 'نفقة',
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
        alimony: {
            lawsuitDate: '2026-08-05',
            executionDate: '2026-02-05',
        } as ExecutionFile['alimony'],
        ...overrides,
    } as ExecutionFile;
}

describe('sparkCoherence — execution open + lawsuit', () => {
    it('يكتشف تناقض نفقة في إضبارة تنفيذ مفتوحة', () => {
        const ctx = buildExecutionSparkContext({
            executionData: baseExecutionFile(),
        });
        const report = runSparkCoherenceForExecutionOpen(ctx);
        expect(report.findings.some((f) => f.category === 'timeline')).toBe(true);
        expect(report.coherenceScore).toBeLessThan(50);
    });

    it('يكتشف إجراء جبري مع إضبارة موقوفة', () => {
        const ctx = buildExecutionSparkContext({
            executionData: baseExecutionFile({
                debtorNotificationDate: '2026-01-01',
                notificationCount: 1,
            }),
            executionPaused: true,
            runtimeOverlay: { activeCoerciveActions: ['salary'] },
        });
        const report = runSparkCoherenceForExecutionOpen(ctx);
        expect(report.findings.some((f) => f.id === 'open:paused-with-coercive')).toBe(true);
    });

    it('يُدمج تنبيهات التماسك في طابور التنفيذ', () => {
        const ctx = buildExecutionSparkContext({
            executionData: baseExecutionFile(),
        });
        const queue = pickExecutionSparkNudgeQueue(ctx, 8);
        expect(queue.some((n) => n.kind.startsWith('coherence.'))).toBe(true);
    });

    it('يكتشف أحداثاً بلا تاريخ في ملف الدعوى', () => {
        const ctx = buildLawsuitSparkContext({
            file: { id: 'f1' },
            parentData: { id: 'f1', caseNo: '10/2026' },
            displayStage: {
                id: 's1',
                name: 'البداءة',
                stageName: 'مرحلة البداءة',
                courtName: 'محكمة البداءة',
                filingDate: '2026-01-01',
            },
            stages: [],
            displayTimeline: [
                { id: 't1', type: 'note', title: 'مذكرة أولى' },
                { id: 't2', type: 'note', title: 'مذكرة ثانية' },
            ],
            status: 'نشطة',
        });
        const report = runSparkCoherenceForLawsuit(ctx);
        expect(report.findings.some((f) => f.id === 'lawsuit:undated-events')).toBe(true);
    });

    it('يُدمج تنبيهات التماسك في طابور الدعوى', () => {
        const ctx = buildLawsuitSparkContext({
            file: { id: 'f2' },
            parentData: { id: 'f2' },
            displayStage: {
                id: 's1',
                name: 'البداءة',
                filingDate: '2026-01-01',
            },
            stages: [],
            displayTimeline: [
                { id: 't1', type: 'note', title: 'بدون تاريخ' },
                { id: 't2', type: 'note', title: 'بدون تاريخ أيضاً' },
            ],
            status: 'نشطة',
        });
        const nudges = coherenceReportToSparkNudges(
            runSparkCoherenceForLawsuit(ctx),
            ctx.dossierKey,
            'lawsuit',
        );
        expect(nudges.some((n) => n.kind === 'coherence.timeline')).toBe(true);

        const queue = pickLawsuitSparkNudgeQueue(ctx, 8);
        expect(queue.some((n) => n.kind.startsWith('coherence.'))).toBe(true);
    });
});

import { describe, expect, it } from 'vitest';
import {
    buildHomeProceduralAttentionNudge,
    buildHomeProceduralAttentionNudges,
    countHomeSparkHitsBySection,
    resolveHomeSparkRoutePath,
    scanHomeSparkHits,
} from '@/app/spark/engine/homeSparkAggregateScan';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';

const emptySources: ClusterScanSources = {
    lawsuitFiles: [],
    executionFiles: [],
    criminalCases: [],
    urgentCases: [],
    threadingTransactions: [],
    threadingTasks: [],
    notes: [],
    fieldTasks: [],
    vaultDocs: [],
    calendarEvents: [],
    ready: false,
};

describe('homeSparkAggregateScan', () => {
    it('لا يُرجع نتائج عند غياب الملفات', () => {
        expect(scanHomeSparkHits(emptySources)).toEqual([]);
        expect(buildHomeProceduralAttentionNudge([])).toBeNull();
        expect(buildHomeProceduralAttentionNudges([])).toEqual([]);
    });

    it('يمسح التنفيذ حتى قبل جاهزية المستعجل', () => {
        const executionFile = {
            id: 'exec-1',
            executionCaseNumber: '0حخهخحهخ/2026',
            dossier_lifecycle_status: 'active',
            debtAmount: 100_000,
            debtorNotificationDate: '2026-01-01',
            execution_memo_anchor_date: '2026-01-01',
            notice_voluntary_period_end_declared: true,
            notificationCount: 2,
            debtors: [{ id: 'd1', name: 'مدين' }],
            executive_detention_judge_eligible_decision_id: 'dec-1',
            executive_detention_judge_outcome: null,
        };

        const sources: ClusterScanSources = {
            ...emptySources,
            ready: false,
            executionFiles: [executionFile],
        };

        const hits = scanHomeSparkHits(sources);
        expect(hits).toHaveLength(1);
        expect(hits[0].section).toBe('execution');
        expect(hits[0].kind).toBe('execution.detention_judge_followup');
    });

    it('لا يضمّ المستعجل قبل ready', () => {
        const urgentCase = {
            id: 'urg-1',
            caseNo: '1/2026',
            grievanceNotificationConfirmed: false,
        };

        const sources: ClusterScanSources = {
            ...emptySources,
            ready: false,
            urgentCases: [urgentCase],
        };

        expect(scanHomeSparkHits(sources)).toEqual([]);
    });

    it('يُنشئ إشعاراً لإضبارة دعوى واحدة', () => {
        const lawsuitFile = {
            id: 'law-1',
            status: 'نشطة',
            caseNo: '10/2026',
            lawsuitJurisdiction: 'civil',
            representedParty: 'المدعي',
            stages: [
                {
                    id: 's1',
                    name: 'البداءة',
                    status: 'active',
                    stageName: 'مرحلة البداءة',
                    isPleadingsClosed: true,
                    judgmentForm: 'غيابي',
                    lastJudgmentType: 'غيابي',
                    finalDecision: 'إجابة الدعوى',
                    awaitingAbsentJudgmentNotification: true,
                },
            ],
            activeStageIndex: 0,
        };

        const sources: ClusterScanSources = {
            ...emptySources,
            ready: true,
            lawsuitFiles: [lawsuitFile],
        };

        const hits = scanHomeSparkHits(sources);
        expect(hits).toHaveLength(1);
        expect(hits[0].section).toBe('lawsuit');
        expect(hits[0].routePath).toBe('workspace:lawsuit:law-1');

        const summary = buildHomeProceduralAttentionNudge(hits);
        expect(summary?.kind).toBe('home.procedural_attention_summary');
        expect(summary?.surface).toBe('home');
        expect(summary?.message).toContain('10/2026');

        expect(resolveHomeSparkRoutePath(hits, 'law-1')).toBe('workspace:lawsuit:law-1');
    });

    it('يفصل الإشعارات حسب القسم والموضوع والإضبارة', () => {
        const hits = [
            {
                section: 'execution' as const,
                targetFileId: 'exec-1',
                dossierKey: 'exec:1',
                caseLabel: '1/2026',
                kind: 'execution.debtor_unnotified' as const,
                kindLabel: 'غير مبلّغ',
                routePath: 'workspace:execution:exec-1',
            },
            {
                section: 'field' as const,
                targetFileId: 'task-1',
                dossierKey: 'field:1',
                caseLabel: 'مهمة ميدانية',
                kind: 'field.due_today' as const,
                kindLabel: 'مهمة اليوم',
                routePath: 'workspace:task:task-1',
            },
            {
                section: 'execution' as const,
                targetFileId: 'exec-2',
                dossierKey: 'exec:2',
                caseLabel: '2/2026',
                kind: 'execution.debtor_unnotified' as const,
                kindLabel: 'غير مبلّغ',
                routePath: 'workspace:execution:exec-2',
            },
        ];

        const nudges = buildHomeProceduralAttentionNudges(hits);
        expect(nudges).toHaveLength(3);
        expect(nudges.map((n) => n.targetFileId)).toEqual(['exec-1', 'task-1', 'exec-2']);
    });

    it('countHomeSparkHitsBySection يُجمّع حسب القسم', () => {
        const lawsuitFile = {
            id: 'law-1',
            status: 'نشطة',
            caseNo: '10/2026',
            lawsuitJurisdiction: 'civil',
            representedParty: 'المدعي',
            stages: [
                {
                    id: 's1',
                    name: 'البداءة',
                    status: 'active',
                    stageName: 'مرحلة البداءة',
                    isPleadingsClosed: true,
                    judgmentForm: 'غيابي',
                    lastJudgmentType: 'غيابي',
                    finalDecision: 'إجابة الدعوى',
                    awaitingAbsentJudgmentNotification: true,
                },
            ],
            activeStageIndex: 0,
        };

        const counts = countHomeSparkHitsBySection({
            ...emptySources,
            lawsuitFiles: [lawsuitFile],
        });

        expect(counts.lawsuit).toBe(1);
        expect(counts.execution).toBeUndefined();
    });

    it('يمسح المستودع من الملاحظات والخزنة', () => {
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const hits = scanHomeSparkHits({
            ...emptySources,
            notes: [
                {
                    id: 'note-1',
                    title: 'تذكير',
                    reminder_at: tomorrow,
                } as import('@/app/components/lawyer/LawyerDashboardParts/types').GlobalNote,
            ],
            vaultDocs: [
                {
                    id: 'vault-1',
                    name: 'عقد.pdf',
                    boundDossierId: null,
                    type: 'pdf',
                    category: 'عام',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                } as import('@/app/services/vault/vaultTypes').SmartVaultDoc,
            ],
        });

        expect(hits.some((hit) => hit.section === 'repository')).toBe(true);
        expect(hits.some((hit) => hit.kind === 'repository.note_reminder_near')).toBe(true);
        expect(hits.some((hit) => hit.kind === 'repository.vault_unbound_docs')).toBe(true);
    });
});

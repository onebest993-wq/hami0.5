import { describe, expect, it } from 'vitest';
import { collectCriminalSparkNudges } from '@/app/spark/procedural/criminalNudgeRules';
import { collectUrgentSparkNudges } from '@/app/spark/procedural/urgentNudgeRules';
import { buildCriminalSparkContext } from '@/app/spark/context/criminalSparkContext';
import { buildUrgentSparkContext } from '@/app/spark/context/urgentSparkContext';

describe('criminalNudgeRules', () => {
    it('يُولّد تنبيه المادة 3 عند تجاوز 90 يوماً', () => {
        const ctx = buildCriminalSparkContext({
            caseId: 'c1',
            shouldShowArticle3DeadlineBanner: true,
            article3ElapsedDays: 95,
        });
        const kinds = collectCriminalSparkNudges(ctx).map((n) => n.kind);
        expect(kinds).toContain('criminal.article3_deadline');
    });

    it('لا يُولّد تنبيهات للإضبارة المؤرشفة', () => {
        const ctx = buildCriminalSparkContext({
            caseId: 'c-arch',
            isArchived: true,
            shouldShowArticle3DeadlineBanner: true,
            article3ElapsedDays: 120,
        });
        expect(collectCriminalSparkNudges(ctx)).toHaveLength(0);
    });
});

describe('urgentNudgeRules', () => {
    it('يُولّد تنبيه بيانات التنفيذ الناقصة', () => {
        const ctx = buildUrgentSparkContext({
            caseId: 'u1',
            fileStatus: 'execution',
            activeLifecycleStep: 'execution',
            judgeDecision: { decision: 'accepted', decisionDate: '2026-01-01', requiresGuarantee: false },
            executionData: { executionDate: '', notificationDate: '', deadlineDays: 3, authority: '', notes: '' },
            grievanceData: { rejectionNotificationDate: '', outcome: '', filingDate: '' },
            grievanceDecisionNotificationConfirmed: true,
            cassationData: { filedBy: null, outcome: '', filingDate: '', fileNumber: '' },
        });
        const kinds = collectUrgentSparkNudges(ctx).map((n) => n.kind);
        expect(kinds).toContain('urgent.execution_data_incomplete');
    });

    it('يُولّد تنبيه متابعة التمييز عند غياب النتيجة', () => {
        const ctx = buildUrgentSparkContext({
            caseId: 'u2',
            fileStatus: 'cassation',
            activeLifecycleStep: 'cassation',
            judgeDecision: { decision: 'rejected', decisionDate: '2026-01-01', requiresGuarantee: false },
            executionData: {
                executionDate: '2026-01-05',
                notificationDate: '2026-01-06',
                deadlineDays: 3,
                authority: 'محكمة',
                notes: '',
            },
            grievanceData: { rejectionNotificationDate: '', outcome: 'filed', filingDate: '' },
            grievanceDecisionNotificationConfirmed: true,
            cassationData: { filedBy: 'plaintiff', outcome: '', filingDate: '2026-02-01', fileNumber: 'T-1' },
        });
        const kinds = collectUrgentSparkNudges(ctx).map((n) => n.kind);
        expect(kinds).toContain('urgent.cassation_followup');
    });
});

import { describe, expect, it } from 'vitest';
import { buildCriminalSparkContext } from '@/app/spark/context/criminalSparkContext';
import { buildUrgentSparkContext } from '@/app/spark/context/urgentSparkContext';
import { runSparkCoherenceForCriminal } from '@/app/spark/coherence/runSparkCoherenceForCriminal';
import { runSparkCoherenceForUrgent } from '@/app/spark/coherence/runSparkCoherenceForUrgent';
import { pickActiveCriminalSparkNudge } from '@/app/spark/engine/sparkCriminalEngine';
import { pickActiveUrgentSparkNudge } from '@/app/spark/engine/sparkUrgentEngine';
import type { VerdictCard } from '@/app/components/lawyer/criminal-system/verdictCardsEngine';

describe('sparkCoherence — criminal + urgent', () => {
    it('يكتشف نشراً غيابياً يسبق صدور الحكم', () => {
        const cards: VerdictCard[] = [
            {
                id: 'v1',
                outcome: 'إدانة',
                issuedAt: '2026-06-01',
                appealDeadline: '2026-07-01',
                presenceType: 'غيابي',
                absentiaPublicationDate: '2026-05-01',
            },
        ];
        const ctx = buildCriminalSparkContext({
            caseId: 'c1',
            caseNumber: '10/2026',
            verdictCards: cards,
        });
        const report = runSparkCoherenceForCriminal(ctx);
        expect(report.findings.some((f) => f.id.startsWith('criminal:pub-before-issued'))).toBe(true);
    });

    it('يُدمج التماسك الجزائي دون طغيان على القواعد الإجرائية', () => {
        const ctx = buildCriminalSparkContext({
            caseId: 'c2',
            caseNumber: '11/2026',
            shouldShowArticle3DeadlineBanner: true,
            article3ElapsedDays: 120,
            verdictCards: [],
        });
        const nudge = pickActiveCriminalSparkNudge(ctx);
        expect(nudge?.kind).toBe('criminal.article3_deadline');
    });

    it('يكتشف تنفيذاً يسبق قرار القاضي في المستعجل', () => {
        const ctx = buildUrgentSparkContext({
            caseId: 'u1',
            requestNumber: 'U-1',
            activeLifecycleStep: 'execution',
            judgeDecision: { decision: 'approved', decisionDate: '2026-06-15' },
            executionData: {
                executionDate: '2026-06-01',
                notificationDate: '2026-06-05',
                deadlineDays: 7,
                authority: 'محكمة',
                notes: '',
            },
        });
        const report = runSparkCoherenceForUrgent(ctx);
        expect(report.findings.some((f) => f.id === 'urgent:execution-before-judge')).toBe(true);
    });

    it('يُبقي تنبيه التظلم غير المؤكّد أعلى من تماسك تكميلي', () => {
        const ctx = buildUrgentSparkContext({
            caseId: 'u2',
            requestNumber: 'U-2',
            activeLifecycleStep: 'grievance',
            fileStatus: 'grievance',
            judgeDecision: { decision: 'rejected', decisionDate: '2026-05-01' },
            grievanceData: { filingDate: '2026-05-10', outcome: 'filed', rejectionNotificationDate: '' },
            grievanceDecisionNotificationConfirmed: false,
        });
        const nudge = pickActiveUrgentSparkNudge(ctx);
        expect(nudge?.kind).toBe('urgent.grievance_notification_unconfirmed');
    });
});

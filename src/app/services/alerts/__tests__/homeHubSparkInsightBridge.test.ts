import { describe, expect, it } from 'vitest';
import {
    countHomeHubSparkInsightTabBoost,
    pickHomeHubSparkInsightForFooter,
    resolveHomeHubSparkInsights,
} from '@/app/services/alerts/homeHubSparkInsightBridge';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';

describe('homeHubSparkInsightBridge', () => {
    const nowMs = Date.parse('2026-08-05T10:00:00');

    it('لا يكرّر جلسة اليوم إذا كانت في الرادار', () => {
        const sources: ClusterScanSources = {
            ready: true,
            calendarEvents: [
                {
                    id: 'ht-1',
                    title: 'جلسة اليوم',
                    date: '2026-08-05',
                    time: '14:00',
                    type: 'hearing',
                    source: 'hearing',
                    court: 'محكمة الرصافة',
                },
            ],
            lawsuitFiles: [],
            executionFiles: [],
            criminalCases: [],
            urgentCases: [],
            threadingTransactions: [],
            threadingTasks: [],
            notes: [],
            fieldTasks: [],
            vaultDocs: [],
        };

        const insights = resolveHomeHubSparkInsights(sources, [], [
            { id: 'ht-1', title: 'جلسة اليوم', date: '2026-08-05' } as never,
        ]);

        expect(insights.calendar).toBeNull();
        expect(countHomeHubSparkInsightTabBoost(insights)).toBe(0);
    });

    it('يعرض تاريخاً غير مجدول حتى بدون أحداث تقويم', () => {
        const sources: ClusterScanSources = {
            ready: true,
            calendarEvents: [],
            lawsuitFiles: [{ id: 'law-1', reviewDate: '2026-08-08' }],
            executionFiles: [],
            criminalCases: [],
            urgentCases: [],
            threadingTransactions: [],
            threadingTasks: [],
            notes: [],
            fieldTasks: [],
            vaultDocs: [],
        };

        const insights = resolveHomeHubSparkInsights(sources, [], []);
        expect(insights.calendar?.kind).toBe('calendar.unscheduled_dossier_date');
        expect(countHomeHubSparkInsightTabBoost(insights)).toBe(1);
    });

    it('يخفِي الملخص الإجرائي عند وجود تنبيهات تقليدية', () => {
        const insights = {
            calendar: null,
            homeNudges: [
                {
                    id: 'home:agg',
                    kind: 'home.procedural_attention_summary' as const,
                    surface: 'home' as const,
                    priority: 5,
                    message: '8 إضابير',
                    presence: { present: [], missing: [] },
                    source: 'test',
                    dossierKey: 'home',
                },
            ],
        };

        expect(
            pickHomeHubSparkInsightForFooter(insights, {
                suppressHomeAggregateWhenTraditionalAlerts: true,
            }),
        ).toBeNull();
        expect(
            pickHomeHubSparkInsightForFooter(insights, {
                suppressHomeAggregateWhenTraditionalAlerts: false,
            }),
        ).toBe(insights.homeNudges[0]);
    });
});

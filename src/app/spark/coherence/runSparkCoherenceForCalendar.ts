import type { CalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import type { SparkCoherenceReport } from '@/app/spark/coherence/types';
import { runSparkCoherenceEngine } from '@/app/spark/coherence/sparkCoherenceEngine';
import {
    mergeDomainFindingsForCalendar,
    normalizeCoherenceFromCalendar,
} from '@/app/spark/coherence/normalize/fromCalendar';
import {
    computeBundleCompleteness,
    computeCoherenceScoreFromFindings,
} from '@/app/spark/coherence/computeCoherenceScore';

export function runSparkCoherenceForCalendar(ctx: CalendarSparkContext): SparkCoherenceReport {
    const bundle = normalizeCoherenceFromCalendar(ctx);
    const base = runSparkCoherenceEngine(bundle);
    const findings = mergeDomainFindingsForCalendar(ctx, base.findings);
    const coherenceScore = computeCoherenceScoreFromFindings(findings);
    const completeness = computeBundleCompleteness(bundle);
    const priority =
        findings.find((f) => f.severity === 'critical') ??
        findings.find((f) => f.severity === 'warning') ??
        null;

    return {
        ...base,
        findings,
        coherenceScore,
        completeness,
        priorityIssueId: priority?.id ?? null,
        sparkBrief: priority?.observation ?? base.sparkBrief,
        synthesis:
            findings.length > 0
                ? `تماسك التقويم: ${findings.length} ملاحظة جدولية.`
                : base.synthesis,
    };
}

import type { UrgentSparkContext } from '@/app/spark/context/urgentSparkContext';
import type { SparkCoherenceReport } from '@/app/spark/coherence/types';
import { runSparkCoherenceEngine } from '@/app/spark/coherence/sparkCoherenceEngine';
import {
    mergeDomainFindingsForUrgent,
    normalizeCoherenceFromUrgent,
} from '@/app/spark/coherence/normalize/fromUrgent';
import {
    computeBundleCompleteness,
    computeCoherenceScoreFromFindings,
} from '@/app/spark/coherence/computeCoherenceScore';

export function runSparkCoherenceForUrgent(ctx: UrgentSparkContext): SparkCoherenceReport {
    const bundle = normalizeCoherenceFromUrgent(ctx);
    const base = runSparkCoherenceEngine(bundle);
    const findings = mergeDomainFindingsForUrgent(ctx, base.findings);
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
                ? `تماسك المستعجل: ${findings.length} ملاحظة (${findings.filter((f) => f.severity === 'critical').length} حرجة).`
                : base.synthesis,
    };
}

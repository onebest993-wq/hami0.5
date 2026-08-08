import type { ExecutionCreationSparkContext } from '@/app/spark/context/executionCreationSparkContext';
import type { SparkCoherenceReport } from '@/app/spark/coherence/types';
import { runSparkCoherenceEngine } from '@/app/spark/coherence/sparkCoherenceEngine';
import {
    mergeDomainFindingsForExecutionCreation,
    normalizeCoherenceFromExecutionCreation,
} from '@/app/spark/coherence/normalize/fromExecutionCreation';
import {
    computeBundleCompleteness,
    computeCoherenceScoreFromFindings,
} from '@/app/spark/coherence/computeCoherenceScore';

export function runSparkCoherenceForExecutionCreation(
    ctx: ExecutionCreationSparkContext,
): SparkCoherenceReport {
    const bundle = normalizeCoherenceFromExecutionCreation(ctx);
    const base = runSparkCoherenceEngine(bundle);
    const findings = mergeDomainFindingsForExecutionCreation(ctx, base.findings);
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
                ? `تماسك الإنشاء: ${findings.length} ملاحظة (${findings.filter((f) => f.severity === 'critical').length} حرجة).`
                : base.synthesis,
    };
}

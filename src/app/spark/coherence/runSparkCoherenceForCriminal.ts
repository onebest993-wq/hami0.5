import type { CriminalSparkContext } from '@/app/spark/context/criminalSparkContext';
import type { SparkCoherenceReport } from '@/app/spark/coherence/types';
import { runSparkCoherenceEngine } from '@/app/spark/coherence/sparkCoherenceEngine';
import {
    mergeDomainFindingsForCriminal,
    normalizeCoherenceFromCriminal,
} from '@/app/spark/coherence/normalize/fromCriminal';
import {
    computeBundleCompleteness,
    computeCoherenceScoreFromFindings,
} from '@/app/spark/coherence/computeCoherenceScore';

export function runSparkCoherenceForCriminal(ctx: CriminalSparkContext): SparkCoherenceReport {
    const bundle = normalizeCoherenceFromCriminal(ctx);
    const base = runSparkCoherenceEngine(bundle);
    const findings = mergeDomainFindingsForCriminal(ctx, base.findings);
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
                ? `تماسك الجزائي: ${findings.length} ملاحظة (${findings.filter((f) => f.severity === 'critical').length} حرجة).`
                : base.synthesis,
    };
}

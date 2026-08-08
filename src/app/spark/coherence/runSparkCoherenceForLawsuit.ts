import type { LawsuitSparkContext } from '@/app/spark/context/lawsuitSparkContext';
import type { SparkCoherenceFinding, SparkCoherenceReport } from '@/app/spark/coherence/types';
import { runSparkCoherenceEngine } from '@/app/spark/coherence/sparkCoherenceEngine';
import {
    mergeDomainFindingsForLawsuit,
    normalizeCoherenceFromLawsuit,
} from '@/app/spark/coherence/normalize/fromLawsuit';
import {
    computeBundleCompleteness,
    computeCoherenceScoreFromFindings,
} from '@/app/spark/coherence/computeCoherenceScore';
import {
    applyVaultDocsToCoherenceBundle,
    runVaultCoherenceFindings,
} from '@/app/spark/coherence/vault/vaultCoherenceBridge';

function mergeVaultFindings(
    baseFindings: SparkCoherenceFinding[],
    vaultFindings: SparkCoherenceFinding[],
) {
    const seen = new Set(baseFindings.map((f) => f.id));
    const merged = [...baseFindings];
    for (const f of vaultFindings) {
        if (seen.has(f.id)) continue;
        merged.push(f);
    }
    return merged;
}

export function runSparkCoherenceForLawsuit(ctx: LawsuitSparkContext): SparkCoherenceReport {
    const vaultDocs = ctx.boundVaultDocs ?? [];
    const baseBundle = normalizeCoherenceFromLawsuit(ctx);
    let bundle = baseBundle;
    if (vaultDocs.length > 0) {
        bundle = applyVaultDocsToCoherenceBundle(baseBundle, vaultDocs);
    }
    const base = runSparkCoherenceEngine(bundle);
    let findings = mergeDomainFindingsForLawsuit(ctx, base.findings);
    if (vaultDocs.length > 0) {
        findings = mergeVaultFindings(
            findings,
            runVaultCoherenceFindings(vaultDocs, baseBundle, { dossierLabel: 'إضبارة الدعوى' }),
        );
    }
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
                ? `تماسك الدعوى: ${findings.length} ملاحظة (${findings.filter((f) => f.severity === 'critical').length} حرجة).`
                : base.synthesis,
    };
}

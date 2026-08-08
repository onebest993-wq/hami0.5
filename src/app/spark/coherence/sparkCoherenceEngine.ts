import type {
    SparkCoherenceContextBundle,
    SparkCoherenceFinding,
    SparkCoherenceReport,
    SparkCoherenceRule,
} from '@/app/spark/coherence/types';
import {
    computeBundleCompleteness,
    computeCoherenceScoreFromFindings,
} from '@/app/spark/coherence/computeCoherenceScore';
import { runTimelineOrderingRule } from '@/app/spark/coherence/rules/timelineOrderingRule';
import { runFactConflictRule } from '@/app/spark/coherence/rules/factConflictRule';
import { runTextRegistryRule } from '@/app/spark/coherence/rules/textRegistryRule';
import { runAmountClaimRule } from '@/app/spark/coherence/rules/amountClaimRule';
import { runActionStateRule } from '@/app/spark/coherence/rules/actionStateRule';
import { runDomainPluginRules } from '@/app/spark/coherence/plugins/domainCoherencePlugins';

const CORE_RULES: SparkCoherenceRule[] = [
    { id: 'timeline-ordering', run: runTimelineOrderingRule },
    { id: 'fact-conflict', run: runFactConflictRule },
    { id: 'text-registry', run: runTextRegistryRule },
    { id: 'amount-claim', run: runAmountClaimRule },
    { id: 'action-state', run: runActionStateRule },
];

function dedupeFindings(findings: SparkCoherenceFinding[]): SparkCoherenceFinding[] {
    const seen = new Set<string>();
    const out: SparkCoherenceFinding[] = [];
    for (const f of findings) {
        if (seen.has(f.id)) continue;
        seen.add(f.id);
        out.push(f);
    }
    return out;
}

function buildSynthesis(bundle: SparkCoherenceContextBundle, findings: SparkCoherenceFinding[]): string {
    if (findings.length === 0) {
        return 'لا تناقضات ظاهرة في السجل الحالي — راجع قبل الإرسال أو الحفظ.';
    }
    const critical = findings.filter((f) => f.severity === 'critical').length;
    const warning = findings.filter((f) => f.severity === 'warning').length;
    const parts = [`سطح ${bundle.surface}: ${findings.length} ملاحظة تماسك.`];
    if (critical) parts.push(`${critical} حرجة.`);
    if (warning) parts.push(`${warning} تحذيرية.`);
    return parts.join(' ');
}

/**
 * محرك تماسك عام — يكتشف التناقضات عبر نصوص وحقائق وتواريخ وإجراءات.
 * محلي بالكامل (بدون LLM) — يعمل في الخلفية ويُغذّي سبارك.
 */
export function runSparkCoherenceEngine(bundle: SparkCoherenceContextBundle): SparkCoherenceReport {
    const findings: SparkCoherenceFinding[] = [];

    for (const rule of CORE_RULES) {
        if (rule.surfaces && !rule.surfaces.includes(bundle.surface)) continue;
        findings.push(...rule.run(bundle));
    }
    findings.push(...runDomainPluginRules(bundle));

    const unique = dedupeFindings(findings);
    const coherenceScore = computeCoherenceScoreFromFindings(unique);
    const completeness = computeBundleCompleteness(bundle);

    const priority =
        unique.find((f) => f.severity === 'critical') ??
        unique.find((f) => f.severity === 'warning') ??
        null;

    const sparkBrief = priority
        ? priority.observation
        : coherenceScore >= 85
          ? 'السجل متسق — لا تناقضات بارزة.'
          : buildSynthesis(bundle, unique);

    return {
        coherenceScore,
        completeness,
        sparkBrief,
        priorityIssueId: priority?.id ?? null,
        synthesis: buildSynthesis(bundle, unique),
        findings: unique,
        inferences: [],
        recommendations: priority?.actionId
            ? [
                  {
                      id: `rec:${priority.id}`,
                      action: priority.actionLabel ?? 'مراجعة',
                      rationale: priority.evidence[0] ?? 'تناقض يستحق المراجعة قبل الإجراء.',
                      actionId: priority.actionId,
                  },
              ]
            : [],
    };
}

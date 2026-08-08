import type { SparkCoherenceContextBundle, SparkCoherenceFinding } from '@/app/spark/coherence/types';

/** حقائق متعارضة لنفس المفتاح من مصادر مختلفة */
export function runFactConflictRule(bundle: SparkCoherenceContextBundle): SparkCoherenceFinding[] {
    const byKey = new Map<string, SparkCoherenceContextBundle['facts']>();
    for (const f of bundle.facts) {
        const list = byKey.get(f.key) ?? [];
        list.push(f);
        byKey.set(f.key, list);
    }

    const findings: SparkCoherenceFinding[] = [];
    for (const [key, facts] of byKey) {
        if (facts.length < 2) continue;
        const values = new Set(facts.map((f) => String(f.value)));
        if (values.size <= 1) continue;
        findings.push({
            id: `fact:conflict:${key}`,
            category: 'cross_field',
            severity: 'warning',
            observation: `تعارض في «${key}»: قيم متعددة في السجل.`,
            evidence: facts.map((f) => `${f.source}: ${f.value}`),
            actionId: 'focus_coherence_fields',
            actionLabel: 'مراجعة البيانات',
        });
    }
    return findings;
}

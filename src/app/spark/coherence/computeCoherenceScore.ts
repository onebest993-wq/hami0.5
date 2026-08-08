import type { SparkCoherenceFinding } from '@/app/spark/coherence/types';

/** درجة تماسك عامة من قائمة الملاحظات */
export function computeCoherenceScoreFromFindings(findings: SparkCoherenceFinding[]): number {
    if (findings.some((f) => f.severity === 'critical')) {
        const criticalCount = findings.filter((f) => f.severity === 'critical').length;
        return Math.max(0, 15 - criticalCount * 10);
    }
    let score = 100;
    for (const f of findings) {
        if (f.severity === 'warning') score -= 16;
        else if (f.severity === 'info') score -= 5;
    }
    return Math.max(0, Math.min(100, score));
}

export function computeBundleCompleteness(bundle: {
    dates: { ymd: string }[];
    claims: unknown[];
    facts: unknown[];
}): number {
    const slots = [
        bundle.dates.some((d) => d.ymd),
        bundle.claims.length > 0,
        bundle.facts.length > 0,
    ];
    const filled = slots.filter(Boolean).length;
    return Math.round((filled / slots.length) * 100);
}

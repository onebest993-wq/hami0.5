import type { SparkCoherenceContextBundle, SparkCoherenceFinding } from '@/app/spark/coherence/types';

/** مطالبة بمبلغ مسجّل يختلف عن مبلغ محرك/حقيقة */
export function runAmountClaimRule(bundle: SparkCoherenceContextBundle): SparkCoherenceFinding[] {
    const findings: SparkCoherenceFinding[] = [];
    const engineAmount = bundle.facts.find((f) => f.key === 'calculated_total')?.value;
    if (engineAmount == null) return findings;

    const engineNum = typeof engineAmount === 'number' ? engineAmount : parseFloat(String(engineAmount));
    if (!Number.isFinite(engineNum) || engineNum <= 0) return findings;

    for (const claim of bundle.claims) {
        if (claim.amount == null || claim.amount <= 0) continue;
        const drift = Math.abs(claim.amount - engineNum);
        if (drift > engineNum * 0.02) {
            findings.push({
                id: `amount:claim-engine:${claim.id}`,
                category: 'amount',
                severity: 'warning',
                observation: `مبلغ مطالبة «${claim.type}» (${claim.amount.toLocaleString('ar-IQ')}) يختلف عن المحسوب (${engineNum.toLocaleString('ar-IQ')}).`,
                evidence: [claim.source],
                actionId: 'focus_claim_amount',
                actionLabel: 'مراجعة المبلغ',
            });
        }
    }
    return findings;
}

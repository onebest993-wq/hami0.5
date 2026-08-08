import type { SparkCoherenceContextBundle, SparkCoherenceFinding } from '@/app/spark/coherence/types';

/** إجراء يتناقض مع حالة السجل (مثلاً تنفيذ رغم سند محجوب) */
export function runActionStateRule(bundle: SparkCoherenceContextBundle): SparkCoherenceFinding[] {
    const findings: SparkCoherenceFinding[] = [];
    const blocked = bundle.facts.some((f) => f.key === 'document_blocked' && f.value === true);
    const hasProceedAction = bundle.actions.some(
        (a) => /save|submit|open|تنفيذ|حفظ/i.test(a.type) || /save|submit/i.test(a.label ?? ''),
    );
    const hasAmount = bundle.claims.some((c) => (c.amount ?? 0) > 0);

    if (blocked && (hasProceedAction || hasAmount)) {
        findings.push({
            id: 'action:blocked-but-proceeding',
            category: 'action',
            severity: 'warning',
            observation: 'السجل يُشير لسند غير قابل للتنفيذ المباشر، لكن بيانات/إجراء يوحي بالمتابعة.',
            evidence: bundle.meta?.status ? [`الحالة: ${bundle.meta.status}`] : [],
        });
    }

    const status = String(bundle.meta?.status ?? '').toLowerCase();
    const closedLike = /archived|closed|مغلق|مؤرشف|منته/i.test(status);
    const mutating = bundle.actions.some((a) => /edit|update|add|push|حفظ|تعديل/i.test(a.type));
    if (closedLike && mutating) {
        findings.push({
            id: 'action:mutate-closed-dossier',
            category: 'action',
            severity: 'info',
            observation: 'إجراء تعديلي على إضبارة تبدو مغلقة أو مؤرشفة.',
            evidence: [status],
        });
    }

    return findings;
}

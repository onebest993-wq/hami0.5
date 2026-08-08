import type { SparkNudge } from '@/app/spark/types';
import { buildUrgentSparkContextFromCaseRecord } from '@/app/spark/context/urgentSparkContext';
import { pickActiveUrgentSparkNudge } from '@/app/spark/engine/sparkUrgentEngine';

export type UrgentArchiveSparkHit = {
    caseId: string;
    dossierKey: string;
    caseLabel: string;
    nudge: SparkNudge;
};

export function scanUrgentCasesForSpark(
    cases: Array<Record<string, unknown>>,
    options?: { maxHits?: number },
): UrgentArchiveSparkHit[] {
    const maxHits = options?.maxHits ?? 24;
    const hits: UrgentArchiveSparkHit[] = [];

    for (const record of cases) {
        if (hits.length >= maxHits) break;
        if (record.archivedAt || record.trashedAt) continue;
        const ctx = buildUrgentSparkContextFromCaseRecord(record);
        if (!ctx) continue;
        const nudge = pickActiveUrgentSparkNudge(ctx);
        if (!nudge) continue;
        hits.push({
            caseId: ctx.caseId,
            dossierKey: ctx.dossierKey,
            caseLabel: ctx.caseLabel,
            nudge,
        });
    }

    return hits;
}

export function buildUrgentArchiveAttentionNudge(hits: UrgentArchiveSparkHit[]): SparkNudge | null {
    if (!hits.length) return null;
    const first = hits[0];
    const count = hits.length;
    const message =
        count === 1
            ? `يبدو أن الطلب المستعجل ${first.caseLabel} يحتاج متابعة خفيفة — هل يهمك الأمر؟`
            : `يبدو أن ${count} طلبات مستعجلة تحتاج متابعة — أولها: ${first.caseLabel}. هل يهمك الأمر؟`;

    return {
        id: `urgent-archive-attention:${first.caseId}`,
        kind: 'urgent.archive_attention_summary',
        surface: 'lawsuit',
        priority: 5,
        message,
        presence: {
            present: [`${count} طلب مستعجل في المسح`],
            missing: ['متابعة إجرائية'],
        },
        source: 'urgentArchiveSparkScan',
        dossierKey: first.dossierKey,
        targetFileId: first.caseId,
        hitCount: count,
        action: { label: 'فتح الطلب', actionId: 'open_dossier' },
    };
}

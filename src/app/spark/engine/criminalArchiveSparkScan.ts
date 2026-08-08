import type { SparkNudge } from '@/app/spark/types';
import { buildCriminalSparkContextFromArchiveRecord } from '@/app/spark/context/criminalSparkContext';
import { pickActiveCriminalSparkNudge } from '@/app/spark/engine/sparkCriminalEngine';

export type CriminalArchiveSparkHit = {
    caseId: string;
    dossierKey: string;
    caseLabel: string;
    nudge: SparkNudge;
};

function resolveCriminalCaseLabel(record: Record<string, unknown>, dossierKey: string): string {
    const basics =
        record.basics && typeof record.basics === 'object'
            ? (record.basics as Record<string, unknown>)
            : {};
    const caseNumber = String(basics.caseNumber ?? basics.dossierNumber ?? record.caseNumber ?? '').trim();
    if (caseNumber) return caseNumber;
    return dossierKey.replace(/^criminal:/, '');
}

export function scanCriminalArchiveForSpark(
    records: Array<Record<string, unknown>>,
    options?: { maxHits?: number },
): CriminalArchiveSparkHit[] {
    const maxHits = options?.maxHits ?? 24;
    const hits: CriminalArchiveSparkHit[] = [];

    for (const record of records) {
        if (hits.length >= maxHits) break;
        const ctx = buildCriminalSparkContextFromArchiveRecord(record);
        if (!ctx) continue;
        const nudge = pickActiveCriminalSparkNudge(ctx);
        if (!nudge) continue;
        hits.push({
            caseId: ctx.caseId,
            dossierKey: ctx.dossierKey,
            caseLabel: resolveCriminalCaseLabel(record, ctx.dossierKey),
            nudge,
        });
    }

    return hits;
}

export function buildCriminalArchiveAttentionNudge(hits: CriminalArchiveSparkHit[]): SparkNudge | null {
    if (!hits.length) return null;
    const first = hits[0];
    const count = hits.length;
    const message =
        count === 1
            ? `يبدو أن الإضبارة الجزائية ${first.caseLabel} تحتاج متابعة خفيفة — هل يهمك الأمر؟`
            : `يبدو أن ${count} إضابير جزائية تحتاج متابعة — أولها: ${first.caseLabel}. هل يهمك الأمر؟`;

    return {
        id: `criminal-archive-attention:${first.caseId}`,
        kind: 'criminal.archive_attention_summary',
        surface: 'criminal',
        priority: 5,
        message,
        presence: {
            present: [`${count} إضبارة جزائية في المسح`],
            missing: ['متابعة إجرائية'],
        },
        source: 'criminalArchiveSparkScan',
        dossierKey: first.dossierKey,
        targetFileId: first.caseId,
        hitCount: count,
        action: { label: 'فتح الإضبارة', actionId: 'open_dossier' },
    };
}

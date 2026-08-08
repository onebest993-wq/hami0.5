import type { SparkNudge } from '@/app/spark/types';
import { buildLawsuitSparkContextFromArchiveFile } from '@/app/spark/context/lawsuitSparkContextFromFile';
import { pickActiveLawsuitSparkNudge } from '@/app/spark/engine/sparkHybridEngine';
import type { LawsuitJurisdictionTab } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';

const ARCHIVE_SKIP_STATUSES = new Set(['مؤرشفة', 'محذوفة', 'في المهملات']);

export type LawsuitArchiveSparkHit = {
    fileId: string;
    dossierKey: string;
    caseLabel: string;
    jurisdiction: 'civil' | 'personal';
    nudge: SparkNudge;
};

function matchesJurisdictionTab(
    file: Record<string, unknown>,
    tab: LawsuitJurisdictionTab,
): boolean {
    if (tab === 'all') return true;
    if (tab === 'criminal') return false;
    const isPersonal = isPersonalStatusFile(
        file as { lawsuitJurisdiction?: string; selectedType?: string },
    );
    if (tab === 'personal') return isPersonal;
    if (tab === 'civil') return !isPersonal;
    return true;
}

function resolveCaseLabel(file: Record<string, unknown>, dossierKey: string): string {
    const caseNo = String(file.caseNo ?? file.caseNumber ?? file.fileNumber ?? '').trim();
    if (caseNo) return caseNo;
    const title = String(file.title ?? file.claimType ?? file.docType ?? '').trim();
    if (title) return title;
    return dossierKey.replace(/^lawsuit:/, '');
}

/** مسح خفيف للإضابير النشطة — بدون LLM */
export function scanLawsuitArchiveForSpark(
    files: Array<Record<string, unknown>>,
    options?: {
        maxHits?: number;
        jurisdictionTab?: LawsuitJurisdictionTab;
    },
): LawsuitArchiveSparkHit[] {
    const maxHits = options?.maxHits ?? 24;
    const tab = options?.jurisdictionTab ?? 'all';
    const hits: LawsuitArchiveSparkHit[] = [];

    for (const file of files) {
        if (hits.length >= maxHits) break;

        const status = String(file.status ?? '').trim();
        if (ARCHIVE_SKIP_STATUSES.has(status)) continue;
        if (!matchesJurisdictionTab(file, tab)) continue;

        const ctx = buildLawsuitSparkContextFromArchiveFile(file);
        if (!ctx) continue;

        const nudge = pickActiveLawsuitSparkNudge(ctx);
        if (!nudge) continue;

        hits.push({
            fileId: ctx.fileId,
            dossierKey: ctx.dossierKey,
            caseLabel: resolveCaseLabel(file, ctx.dossierKey),
            jurisdiction: ctx.jurisdiction === 'personal' ? 'personal' : 'civil',
            nudge,
        });
    }

    return hits;
}

export function buildArchiveAttentionNudge(hits: LawsuitArchiveSparkHit[]): SparkNudge | null {
    if (!hits.length) return null;

    const first = hits[0];
    const count = hits.length;
    const kindLabel =
        first.nudge.kind === 'lawsuit.absent_notification_missing'
            ? 'تبليغ غيابي غير مسجّل'
            : first.nudge.kind === 'lawsuit.abandonment_renewal'
              ? 'ترك للمراجعة يحتاج متابعة'
              : first.nudge.kind === 'lawsuit.interruption_resume'
                ? 'انقطاع يحتاج استئناف'
                : first.nudge.kind === 'lawsuit.appeal_deadline_near'
                  ? 'مهلة طعن قريبة'
                  : first.nudge.kind === 'lawsuit.cassation_deadline_near'
                    ? 'مهلة تمييز قريبة'
                    : 'متابعة إجرائية خفيفة';

    const message =
        count === 1
            ? `يبدو أن إضبارة ${first.caseLabel} تحتاج ${kindLabel} — هل يهمك الأمر؟`
            : `يبدو أن ${count} إضابير نشطة تحتاج متابعة — أولها: ${first.caseLabel} (${kindLabel}). هل يهمك الأمر؟`;

    return {
        id: `archive-attention:${first.fileId}`,
        kind: 'lawsuit.archive_attention_summary',
        surface: 'lawsuit',
        priority: 5,
        message,
        presence: {
            present: [`${count} إضبارة في المسح`],
            missing: [kindLabel],
        },
        source: 'lawsuitArchiveSparkScan',
        dossierKey: first.dossierKey,
        targetFileId: first.fileId,
        hitCount: count,
        action: { label: 'فتح الإضبارة', actionId: 'open_dossier' },
    };
}

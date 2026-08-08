import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { SparkNudge, SparkNudgeKind } from '@/app/spark/types';
import { scanBoundVaultDocsForSpark } from '@/app/spark/engine/repositoryBoundDossierSparkScan';
import { scanNotesForSpark } from '@/app/spark/engine/repositoryNoteSparkScan';
import { scanRepositoryForSpark } from '@/app/spark/engine/repositorySparkScan';

export type RepositoryHomeSparkCandidate = {
    targetFileId: string;
    dossierKey: string;
    caseLabel: string;
    kind: SparkNudgeKind;
};

function nudgeToCandidate(nudge: SparkNudge): RepositoryHomeSparkCandidate | null {
    const targetFileId = String(nudge.targetFileId ?? nudge.id ?? '').trim();
    if (!targetFileId) return null;
    const caseLabel =
        String(nudge.presence?.present?.[0] ?? '').trim() ||
        String(nudge.presence?.missing?.[0] ?? '').trim() ||
        'مستودع';
    return {
        targetFileId,
        dossierKey: nudge.dossierKey ?? 'repository:session',
        caseLabel,
        kind: nudge.kind,
    };
}

function pushUnique(
    hits: RepositoryHomeSparkCandidate[],
    nudge: SparkNudge | null,
    maxHits: number,
): void {
    if (!nudge || hits.length >= maxHits) return;
    const candidate = nudgeToCandidate(nudge);
    if (!candidate) return;
    if (hits.some((hit) => hit.targetFileId === candidate.targetFileId && hit.kind === candidate.kind)) {
        return;
    }
    hits.push(candidate);
}

/** مسح المستودع للرئيسية — ملاحظات، خزنة غير مربوطة، فجوات المربوط */
export function scanRepositoryHomeSparkHits(
    input: {
        vaultDocs: SmartVaultDoc[];
        notes: GlobalNote[];
        lawsuitFiles: FileData[];
        executionFiles: ExecutionFile[];
    },
    options?: { maxHits?: number },
): RepositoryHomeSparkCandidate[] {
    const maxHits = options?.maxHits ?? 3;
    const hits: RepositoryHomeSparkCandidate[] = [];

    pushUnique(hits, scanNotesForSpark(input.notes), maxHits);

    const unbound = input.vaultDocs.filter((doc) => !doc.boundDossierId);
    pushUnique(
        hits,
        scanRepositoryForSpark({
            unboundVaultDocs: unbound,
            vaultDocsForScan: input.vaultDocs,
            lawsuitFiles: input.lawsuitFiles,
            executionFiles: input.executionFiles,
            pendingUpload: false,
        }).nudge,
        maxHits,
    );

    pushUnique(
        hits,
        scanBoundVaultDocsForSpark({
            vaultDocs: input.vaultDocs.filter((doc) => Boolean(doc.boundDossierId)),
            lawsuitFiles: input.lawsuitFiles,
            executionFiles: input.executionFiles,
        }),
        maxHits,
    );

    return hits;
}

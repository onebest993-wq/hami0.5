import type { SparkNudge } from '@/app/spark/types';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import { scanVaultDocAttachmentSignals } from '@/app/spark/engine/vaultAttachmentSparkScan';
import { scanNotesForSpark } from '@/app/spark/engine/repositoryNoteSparkScan';
import { scanBoundVaultDocsForSpark } from '@/app/spark/engine/repositoryBoundDossierSparkScan';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';

export type RepositorySparkScanResult = {
    unboundCount: number;
    processingCount: number;
    nudge: SparkNudge | null;
};

function scanAttachmentNudges(
    docs: SmartVaultDoc[],
    dossierContext?: {
        lawsuitFiles: FileData[];
        executionFiles: ExecutionFile[];
    },
): SparkNudge | null {
    if (dossierContext) {
        const boundGap = scanBoundVaultDocsForSpark({
            vaultDocs: docs.filter((d) => Boolean(d.boundDossierId)),
            lawsuitFiles: dossierContext.lawsuitFiles,
            executionFiles: dossierContext.executionFiles,
        });
        if (boundGap) return boundGap;
    }

    const pendingExtraction = docs.filter((d) => scanVaultDocAttachmentSignals(d).needsExtraction);
    if (pendingExtraction.length > 0) {
        const label =
            pendingExtraction.length === 1
                ? 'ملف واحد'
                : `${pendingExtraction.length} ملفات`;
        return {
            id: 'repository:text-pending',
            kind: 'repository.vault_text_pending',
            surface: 'repository',
            priority: 7,
            message: `${label} بانتظار استخراج النص — سبارك يحلّل المرفقات لاقتراح متابعات.`,
            presence: {
                present: [`${pendingExtraction.length} PDF/صورة`],
                missing: ['نص مستخرج'],
            },
            source: 'vaultAttachmentSparkScan',
            dossierKey: 'repository:session',
            action: { label: 'عرض الملفات', actionId: 'focus_unbound_filter' },
        };
    }

    for (const doc of docs) {
        const { dateHints } = scanVaultDocAttachmentSignals(doc);
        if (dateHints.length === 0) continue;
        if (doc.boundDossierId) continue;
        const title = doc.title || doc.fileName || 'مرفق';
        return {
            id: `repository:date-hint:${doc.id}`,
            kind: 'repository.vault_date_hint',
            surface: 'repository',
            priority: 8,
            message: `المرفق «${title}» يذكر تواريخ (${dateHints.slice(0, 2).join(' · ')}) — هل تود مطابقتها مع السجل الزمني؟`,
            presence: {
                present: dateHints.slice(0, 3),
                missing: ['تسجيل في السجل'],
            },
            source: 'vaultAttachmentSparkScan.dateHints',
            dossierKey: 'repository:session',
            targetFileId: doc.id,
            action: { label: 'مراجعة المرفق', actionId: 'open_vault_doc' },
        };
    }

    return null;
}

export function scanRepositoryForSpark(input: {
    unboundVaultDocs: SmartVaultDoc[];
    pendingUpload: boolean;
    uploadQueueCount?: number;
    vaultDocsForScan?: SmartVaultDoc[];
    notesForScan?: GlobalNote[];
    lawsuitFiles?: FileData[];
    executionFiles?: ExecutionFile[];
}): RepositorySparkScanResult {
    const unboundCount = input.unboundVaultDocs.length;
    const processingCount = input.unboundVaultDocs.filter((d) => d.isProcessing).length;
    const scanPool = input.vaultDocsForScan ?? input.unboundVaultDocs;

    if (input.pendingUpload || (input.uploadQueueCount ?? 0) > 0) {
        return {
            unboundCount,
            processingCount,
            nudge: {
                id: 'repository:upload-meta-pending',
                kind: 'repository.upload_meta_pending',
                surface: 'repository',
                priority: 9,
                message: 'رفع قيد الانتظار — أكمل تصنيف الملف وحفظ البيانات.',
                presence: {
                    present: input.uploadQueueCount ? [`${input.uploadQueueCount} في الطابور`] : [],
                    missing: ['تصنيف الملف', 'حفظ البيانات'],
                },
                source: 'repositorySparkScan',
                dossierKey: 'repository:session',
                action: { label: 'إكمال الرفع', actionId: 'focus_upload_meta' },
            },
        };
    }

    if (unboundCount > 0) {
        const countLabel = unboundCount === 1 ? 'ملف واحد' : `${unboundCount} ملفات`;
        return {
            unboundCount,
            processingCount,
            nudge: {
                id: 'repository:unbound-docs',
                kind: 'repository.vault_unbound_docs',
                surface: 'repository',
                priority: 6,
                message: `يوجد ${countLabel} غير مربوط بإضبارة — هل تود ربطها الآن؟`,
                presence: {
                    present: [`${unboundCount} في الخزنة`],
                    missing: ['ربط بإضبارة'],
                },
                source: 'repositorySparkScan',
                dossierKey: 'repository:session',
                action: { label: 'عرض غير المربوط', actionId: 'focus_unbound_filter' },
            },
        };
    }

    const attachmentNudge = scanAttachmentNudges(scanPool, {
        lawsuitFiles: input.lawsuitFiles ?? [],
        executionFiles: input.executionFiles ?? [],
    });
    if (attachmentNudge) {
        return { unboundCount, processingCount, nudge: attachmentNudge };
    }

    const noteNudge = scanNotesForSpark(input.notesForScan ?? []);
    if (noteNudge) {
        return { unboundCount, processingCount, nudge: noteNudge };
    }

    return { unboundCount, processingCount, nudge: null };
}

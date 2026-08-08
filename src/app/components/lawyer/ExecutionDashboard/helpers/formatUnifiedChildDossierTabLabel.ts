import type { ExecutionFile } from '@/app/types/execution';
import { isInabaSubFileId } from '@/app/stores/executionDashboardStore';
import { formatDossierFileRef } from './dossierMetaValidation';

/** تسمية قصيرة لتبويب الإضبارة الموحّدة — بدون معرّفات تقنية */
export function formatUnifiedChildDossierTabLabel(child: ExecutionFile | null | undefined): string {
    if (!child) return 'إضبارة موحّدة';

    const fileRef = formatDossierFileRef(
        String(child.fileNumber || '').trim(),
        String((child as { fileYear?: string }).fileYear || '').trim(),
    );
    if (fileRef) return fileRef;

    const docNumber = String(child.docNumber || '').trim();
    if (docNumber) return docNumber;

    const directorate = String(
        (child as { delegationTargetDirectorate?: string }).delegationTargetDirectorate ||
            child.directorate ||
            '',
    ).trim();
    if (directorate) return directorate;

    if (isInabaSubFileId(child.id)) {
        return 'إضبارة الإنابة';
    }

    return 'إضبارة موحّدة';
}

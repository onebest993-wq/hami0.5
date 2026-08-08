import type { ExecutionFile } from '@/app/types/execution';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

/** يطابق مرفقات الخزنة المربوطة بإضبارة تنفيذ مفتوحة */
export function resolveVaultDocsBoundToExecution(
    docs: SmartVaultDoc[],
    file: ExecutionFile,
): SmartVaultDoc[] {
    const fileId = String(file.id ?? '').trim();
    const fileNumber = String(
        file.fileNumber ?? file.executionCaseNumber ?? (file as { caseNo?: string }).caseNo ?? '',
    ).trim();

    const accepted = new Set<string>();
    if (fileId) {
        accepted.add(fileId);
        accepted.add(`execution:${fileId}`);
    }
    if (fileNumber) {
        accepted.add(fileNumber);
        accepted.add(`execution:${fileNumber}`);
    }

    return docs.filter((doc) => {
        const bound = String(doc.boundDossierId ?? '').trim();
        if (!bound) return false;
        return accepted.has(bound);
    });
}

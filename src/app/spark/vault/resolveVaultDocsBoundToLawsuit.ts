import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';

function readCaseNo(file: Record<string, unknown>): string {
    return String(
        file.caseNo ?? file.caseNumber ?? file.fileNumber ?? file.number ?? '',
    ).trim();
}

/** يطابق مرفقات الخزنة المربوطة بإضبارة دعوى مفتوحة */
export function resolveVaultDocsBoundToLawsuit(
    docs: SmartVaultDoc[],
    file: Record<string, unknown>,
): SmartVaultDoc[] {
    const fileId = String(file.id ?? '').trim();
    const caseNo = readCaseNo(file);

    const accepted = new Set<string>();
    if (fileId) {
        accepted.add(fileId);
        accepted.add(`lawsuit:${fileId}`);
    }
    if (caseNo) {
        accepted.add(caseNo);
        accepted.add(`lawsuit:${caseNo}`);
    }

    return docs.filter((doc) => {
        const bound = String(doc.boundDossierId ?? '').trim();
        if (!bound) return false;
        return accepted.has(bound);
    });
}

export function lawsuitFileFromSparkRecord(file: Record<string, unknown>): FileData {
    return file as FileData;
}

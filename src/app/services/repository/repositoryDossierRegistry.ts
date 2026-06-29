import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';

export type DossierKind = 'lawsuit' | 'execution';

export type DossierPickerOption = {
    id: string;
    kind: DossierKind;
    label: string;
    subtitle: string;
};

function lawsuitLabel(file: FileData): string {
    const meta = file as unknown as Record<string, unknown>;
    const caseNo = String(file.caseNo ?? '').trim();
    const client = String(meta.clientName ?? meta.plaintiff ?? '').trim();
    if (caseNo && client) return `${caseNo} — ${client}`;
    return caseNo || client || `دعوى #${file.id}`;
}

function executionLabel(file: ExecutionFile): string {
    const no = String(file.fileNumber ?? file.case_no ?? file.caseNo ?? '').trim();
    const debtor = String(
        (file as Record<string, unknown>).debtorName ??
            (file as Record<string, unknown>).clientName ??
            '',
    ).trim();
    if (no && debtor) return `${no} — ${debtor}`;
    return no || debtor || `تنفيذ #${file.id}`;
}

/** قائمة الأضابير القابلة للربط من الدعاوى والتنفيذ */
export function listLinkableDossiers(
    lawsuitFiles: FileData[],
    executionFiles: ExecutionFile[],
): DossierPickerOption[] {
    const lawsuit: DossierPickerOption[] = lawsuitFiles.map((f) => ({
        id: String(f.id),
        kind: 'lawsuit' as const,
        label: lawsuitLabel(f),
        subtitle: 'دعوى',
    }));
    const execution: DossierPickerOption[] = executionFiles.map((f) => ({
        id: String(f.id),
        kind: 'execution' as const,
        label: executionLabel(f),
        subtitle: 'تنفيذ',
    }));
    return [...lawsuit, ...execution].sort((a, b) => a.label.localeCompare(b.label, 'ar'));
}

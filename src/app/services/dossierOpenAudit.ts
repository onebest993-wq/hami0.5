import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { CriminalCase } from '@/app/components/lawyer/criminal-system/criminalStore';
import { AuditLog } from '@/app/services/auditLogPublisher';

function clientNameFromParties(file: FileData): string | undefined {
    return file.parties?.find((p) => p.isClient)?.name?.trim() || undefined;
}

export function auditCriminalDossierOpen(
    caseId: string | null | undefined,
    criminalCases: unknown[],
): void {
    const id = String(caseId ?? '').trim();
    if (!id) return;

    const match = criminalCases.find(
        (raw) =>
            raw &&
            typeof raw === 'object' &&
            String((raw as { id?: string }).id ?? '').trim() === id,
    ) as CriminalCase | undefined;

    const defendant = match?.defendants?.[0]?.fullName?.trim();
    const complainant = match?.complainants?.[0]?.fullName?.trim();
    const caseNo =
        String(match?.location?.caseNumber ?? '').trim() ||
        String(match?.location?.investigationDossierNumber ?? '').trim() ||
        String(match?.location?.baseRegisterNumberAndDate ?? '').trim() ||
        undefined;

    AuditLog.dossier.opened({
        module: 'criminal',
        entityId: id,
        caseNo,
        clientName: defendant || complainant,
    });
}

export function auditActiveDossierOpen(
    activeFile: FileData | ExecutionFile | null | undefined,
): void {
    if (!activeFile || activeFile.id == null) return;
    const id = String(activeFile.id);
    const file = activeFile as FileData & ExecutionFile;

    if (file.type === 'execution') {
        const fileNo = String(file.fileNumber ?? '').trim();
        const year = String(file.fileYear ?? '').trim();
        const caseNo =
            fileNo && year
                ? `${fileNo}/${year}`
                : String(file.caseNo ?? fileNo ?? '').trim() || undefined;

        AuditLog.dossier.opened({
            module: 'execution',
            entityId: id,
            caseNo,
            fileNumber: fileNo || undefined,
            clientName: file.debtors?.[0]?.name?.trim() || clientNameFromParties(file),
        });
        return;
    }

    if (file.type === 'transaction') {
        AuditLog.dossier.opened({
            module: 'threading',
            entityId: id,
            caseNo: file.caseNo,
            clientName: clientNameFromParties(file),
        });
        return;
    }

    void import('@/app/domain/lawsuit/lawsuitJurisdiction')
        .then(({ resolveLawsuitJurisdiction }) => {
            const jurisdiction = resolveLawsuitJurisdiction(file as Record<string, unknown>);
            const module =
                jurisdiction === 'personal'
                    ? 'personal'
                    : jurisdiction === 'criminal'
                      ? 'criminal'
                      : 'civil';
            AuditLog.dossier.opened({
                module,
                entityId: id,
                caseNo: file.caseNo,
                clientName: clientNameFromParties(file),
            });
        })
        .catch(() => {});
}

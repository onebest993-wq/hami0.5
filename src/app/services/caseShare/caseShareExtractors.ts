import type { ExecutionFile } from '@/app/types/execution';
import type { FileData, CaseStage } from '@/app/components/lawyer/LawyerShared';
import type { CriminalCase } from '@/app/components/lawyer/criminal-system/criminalStore';
import type { CaseShareDossierModule, DossierShareSource } from './caseShareTypes';
import { isPersonalStatusFile } from '@/app/components/lawyer/personal-status/personalStatusValidation';
import {
    buildCriminalShareCatalog,
    buildExecutionShareCatalog,
    buildLawsuitShareCatalog,
} from './caseShareCatalogBuilder';

function uniqueStrings(values: string[]): string[] {
    return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function directorateLabel(file: ExecutionFile): string {
    const d = file.directorate;
    return typeof d === 'string' ? d : String(d ?? '');
}

export function extractExecutionShareSource(file: ExecutionFile): DossierShareSource {
    const debtor = file.debtors?.[0]?.name ?? '';
    const creditor = file.creditors?.[0]?.name ?? '';
    const caseNumbers = uniqueStrings([
        file.fileNumber ? `${file.fileNumber}/${file.fileYear ?? ''}` : '',
        file.docNumber ?? '',
    ]);
    const title = `تنفيذ — ${creditor || debtor || file.id}`.slice(0, 120);
    const dir = directorateLabel(file);
    return {
        module: 'execution',
        dossierId: file.id,
        title,
        caseNumbers,
        partyNames: uniqueStrings([creditor, debtor]),
        courtLabel: dir,
        courtProvince: dir,
        narrativeText: [
            file.claimType ? `نوع السند: ${file.claimType}` : '',
            file.notes ? String(file.notes).slice(0, 500) : '',
        ]
            .filter(Boolean)
            .join('\n'),
        documentCount: (file.timelineEvents ?? []).length,
        catalog: buildExecutionShareCatalog(file),
    };
}

export function extractLawsuitShareSource(
    file: FileData,
    stage?: CaseStage | null,
): DossierShareSource {
    const activeStage = stage ?? file.stages?.[file.activeStageIndex ?? 0] ?? file.stages?.[0];
    const module: CaseShareDossierModule = isPersonalStatusFile(file) ? 'personal' : 'lawsuit';
    const stageParties = activeStage?.parties ?? file.parties ?? [];
    const parties = stageParties.map((p) => p.name).filter(Boolean);
    const caseNumbers = uniqueStrings([activeStage?.caseNo ?? '', file.caseNo ?? '']);
    const court = activeStage?.court ?? file.court ?? '';
    const clientParty = stageParties.find((p) => p.isClient);
    const titleLabel =
        activeStage?.stageName ??
        activeStage?.name ??
        clientParty?.name ??
        String(file.id);
    const title = `${module === 'personal' ? 'أحوال شخصية' : 'دعوى'} — ${titleLabel}`.slice(0, 120);
    const narrativeParts = [
        file.notes?.[0]?.text,
        file.subInfo,
        activeStage?.timeline?.[0]?.details,
        activeStage?.timeline?.[0]?.title,
    ].filter((v): v is string => Boolean(v && String(v).trim()));
    return {
        module,
        dossierId: String(file.id),
        title,
        caseNumbers,
        partyNames: uniqueStrings(parties),
        courtLabel: court,
        courtProvince: file.subInfo,
        narrativeText: (narrativeParts[0] ?? '').slice(0, 2000),
        documentCount:
            (file.images?.length ?? 0) +
            (activeStage?.timeline?.filter((e) => e.isAttachment).length ?? 0),
        catalog: buildLawsuitShareCatalog(file, activeStage),
    };
}

export function extractCriminalShareSource(caseData: CriminalCase): DossierShareSource {
    const complainants = (caseData.complainants ?? []).map((c) => c.fullName).filter(Boolean);
    const defendants = (caseData.defendants ?? []).map((d) => d.fullName).filter(Boolean);
    const article = caseData.basics?.legalArticle ?? '';
    const title = `جزائي — ${article || caseData.id}`.slice(0, 120);
    return {
        module: 'criminal',
        dossierId: caseData.id,
        title,
        caseNumbers: uniqueStrings([caseData.id]),
        partyNames: uniqueStrings([...complainants, ...defendants]),
        courtLabel: caseData.physicalLocationCustomName ?? String(caseData.physicalLocation ?? ''),
        narrativeText: [
            article ? `المادة: ${article}` : '',
            caseData.basics?.crimeType ? `نوع الجريمة: ${caseData.basics.crimeType}` : '',
        ]
            .filter(Boolean)
            .join('\n'),
        documentCount: (caseData.otherEvidenceItems ?? []).length,
        catalog: buildCriminalShareCatalog(caseData),
    };
}

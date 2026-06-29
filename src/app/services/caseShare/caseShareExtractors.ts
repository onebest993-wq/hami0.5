import type { ExecutionFile } from '@/app/types/execution';

import { normalizeDossierLifecycleStatus } from '@/app/types/execution';

import type { FileData, CaseStage } from '@/app/components/lawyer/LawyerShared';

import type { CriminalCase } from '@/app/components/lawyer/criminal-system/criminalStore';

import type { CaseShareDossierModule, DossierShareSource, ExecutionShareMeta } from './caseShareTypes';

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



const LIFECYCLE_AR: Record<string, string> = {

    active: 'نشطة',

    paused: 'متوقفة',

    suspended: 'مستأخرة',

    finished: 'منتهية',

};



function buildExecutionShareMeta(file: ExecutionFile): ExecutionShareMeta {

    const lifecycle = normalizeDossierLifecycleStatus(file.dossier_lifecycle_status);

    return {

        directorate: directorateLabel(file),

        fileNumber: String(file.fileNumber ?? '').trim(),

        fileYear: String(file.fileYear ?? '').trim(),

        claimType: String(file.claimType ?? '').trim(),

        documentType: String(file.documentType ?? '').trim(),

        lifecycleStatus: LIFECYCLE_AR[lifecycle] ?? lifecycle,

        docNumber: String(file.docNumber ?? '').trim(),

    };

}



export function extractExecutionShareSource(file: ExecutionFile): DossierShareSource {
    const meta = buildExecutionShareMeta(file);
    const catalog = buildExecutionShareCatalog(file);
    const caseNumbers = uniqueStrings([
        meta.fileNumber ? `${meta.fileNumber}/${meta.fileYear ?? ''}` : '',
        meta.docNumber,
    ]);
    const ref = caseNumbers[0] ?? '';
    const title =
        meta.directorate && ref
            ? `${meta.directorate} — ${ref}`
            : ref || meta.directorate || `تنفيذ — ${file.id}`.slice(0, 120);
    return {
        module: 'execution',
        dossierId: file.id,
        title,
        caseNumbers,
        partyNames: [],
        courtLabel: meta.directorate,
        courtProvince: meta.directorate,
        narrativeText: [
            meta.claimType ? `نوع المطالبة: ${meta.claimType}` : '',
            meta.documentType ? `نوع السند: ${meta.documentType}` : '',
            typeof file.notes === 'string' && file.notes.trim() ? String(file.notes).slice(0, 500) : '',
        ]
            .filter(Boolean)
            .join('\n'),
        documentCount: catalog.find((s) => s.key === 'documents')?.items.length ?? 0,
        catalog,
        executionMeta: meta,
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



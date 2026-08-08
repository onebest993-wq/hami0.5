import type { CaseStage, TimelineEvent } from '@/app/components/lawyer/LawyerShared';
import type { SmartFileParentData } from '@/app/components/lawyer/smart-modal/smartFile/parentDataInit';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import type { SparkJurisdiction } from '@/app/spark/types';
import { resolveLawsuitSparkJurisdiction } from '@/app/spark/context/resolveLawsuitSparkJurisdiction';

export type LawsuitSparkContext = {
    dossierKey: string;
    fileId: string;
    jurisdiction: SparkJurisdiction;
    representedParty: string | null;
    status: string;
    isPaused: boolean;
    pauseReason: string;
    displayStage: CaseStage;
    stages: CaseStage[];
    timeline: TimelineEvent[];
    boundVaultDocs?: SmartVaultDoc[];
};

export function buildLawsuitSparkContext(params: {
    file: Record<string, unknown>;
    parentData: SmartFileParentData;
    displayStage: CaseStage;
    stages: CaseStage[];
    displayTimeline: TimelineEvent[];
    status: string;
    boundVaultDocs?: SmartVaultDoc[];
}): LawsuitSparkContext {
    const fileId = String(params.file?.id ?? params.parentData?.id ?? 'unknown');
    const caseNo = String(
        params.displayStage?.caseNo ??
            params.parentData?.caseNo ??
            params.file?.caseNo ??
            params.file?.caseNumber ??
            '',
    ).trim();
    const dossierKey = caseNo ? `lawsuit:${caseNo}` : `lawsuit:${fileId}`;

    const status = params.status;
    const isPaused =
        status === 'مستأخرة' || status === 'موقوفة اتفاقياً';

    return {
        dossierKey,
        fileId,
        jurisdiction: resolveLawsuitSparkJurisdiction(params.file),
        representedParty: params.parentData?.representedParty ?? null,
        status,
        isPaused,
        pauseReason: String(params.displayStage?.stayReason ?? '').trim(),
        displayStage: params.displayStage,
        stages: params.stages,
        timeline: params.displayTimeline ?? [],
        boundVaultDocs: params.boundVaultDocs,
    };
}

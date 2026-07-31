import type { ExecutionFile } from '@/app/types/execution';

type LegacyExecutionIdentitySource = (ExecutionFile & {
    caseNo?: string;
    clientName?: string;
}) | null | undefined;

export type ExecutionDossierIdentity = {
    caseNo?: string;
    clientName?: string;
};

export function resolveExecutionDossierIdentity(
    executionData: LegacyExecutionIdentitySource,
    file: LegacyExecutionIdentitySource,
): ExecutionDossierIdentity {
    const caseNo = String(
        executionData?.fileNumber ?? executionData?.caseNo ?? file?.fileNumber ?? file?.caseNo ?? '',
    ).trim();
    const clientName = String(
        executionData?.creditors?.[0]?.name ??
            executionData?.clientName ??
            file?.creditors?.[0]?.name ??
            file?.clientName ??
            '',
    ).trim();

    return {
        caseNo: caseNo || undefined,
        clientName: clientName || undefined,
    };
}

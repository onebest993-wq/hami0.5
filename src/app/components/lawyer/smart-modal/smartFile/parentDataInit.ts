import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

export type SmartFileParentData = {
    id: unknown;
    originalParties: unknown[];
    parties?: unknown[];
    caseNo?: string;
    court?: string;
    feesTotal: number | string;
    feesPaid: number | string;
    docType: string;
    createdDate: string;
    representedParty: string | null;
    status?: string;
};

function resolveRepresentedParty(file: Record<string, unknown>): string | null {
    const rp = file.representedParty;
    if (rp === 'plaintiff' || rp === 'client') return 'المدعي';
    if (rp === 'defendant' || rp === 'opponent') return 'المدعى عليه';
    return typeof rp === 'string' ? rp : null;
}

export function buildInitialParentDataFromFile(
    file: Record<string, unknown> | null | undefined,
): SmartFileParentData {
    return {
        id: file?.id,
        originalParties: (file?.originalParties as unknown[]) || (file?.parties as unknown[]) || [],
        parties: (file?.parties as unknown[]) || (file?.originalParties as unknown[]) || [],
        caseNo: typeof file?.caseNo === 'string' ? file.caseNo : typeof file?.caseNumber === 'string' ? file.caseNumber : undefined,
        court: typeof file?.court === 'string' ? file.court : typeof file?.courtName === 'string' ? file.courtName : undefined,
        feesTotal: (file?.feesTotal as number | string) || 0,
        feesPaid: (file?.feesPaid as number | string) || 0,
        docType: String(file?.docType ?? file?.type ?? ''),
        createdDate: typeof file?.date === 'string' ? file.date : getLocalTodayYmd(),
        representedParty: resolveRepresentedParty(file ?? {}),
    };
}

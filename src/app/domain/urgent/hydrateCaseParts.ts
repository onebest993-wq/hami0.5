import type { CaseHearing, ExpertModule, LegalState, UrgentCase } from '@/app/components/lawyer/Component_Urgent_Card';
import { uuidv4 } from '@/app/services/urgent-actions-db';

export function asRecord(raw: unknown): Record<string, unknown> | null {
    if (!raw || typeof raw !== 'object') return null;
    return raw as Record<string, unknown>;
}

export function pickYmdPrefix(value: unknown): string | null {
    const text = typeof value === 'string' ? value : '';
    return text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

export function normalizeUrgentHearings(raw: unknown): CaseHearing[] | undefined {
    if (!Array.isArray(raw)) return undefined;
    const hearings = raw
        .map((item): CaseHearing | null => {
            const hearing = asRecord(item);
            if (!hearing) return null;
            const stage = hearing.stage === 'pre_decision' || hearing.stage === 'grievance' ? hearing.stage : null;
            if (!stage) return null;
            return {
                id: typeof hearing.id === 'string' ? hearing.id : uuidv4(),
                stage,
                sessionDate: typeof hearing.sessionDate === 'string' ? hearing.sessionDate : '',
                notes: typeof hearing.notes === 'string' ? hearing.notes : '',
                nextSessionDate: typeof hearing.nextSessionDate === 'string' ? hearing.nextSessionDate : '',
                createdAt: typeof hearing.createdAt === 'string' ? hearing.createdAt : new Date().toISOString(),
            };
        })
        .filter((hearing): hearing is CaseHearing => hearing !== null);
    return hearings.length ? hearings : undefined;
}

export function resolveHydratedLegalState(row: Record<string, unknown>): LegalState | null {
    if (row.legalState === 'Awaiting_Appeal') return 'Awaiting_Cassation';
    if (
        row.legalState === 'Awaiting_Grievance' ||
        row.legalState === 'Grievance_Filed' ||
        row.legalState === 'Awaiting_Cassation'
    ) {
        return row.legalState;
    }
    return null;
}

export function resolveHydratedRepresentedParty(row: Record<string, unknown>): 'client' | 'opponent' | null {
    const party1 = Array.isArray(row.allParty1) ? row.allParty1 : [];
    const party2 = Array.isArray(row.allParty2) ? row.allParty2 : [];
    const sideHasClient = (list: unknown[]) =>
        list.some((item) => {
            const party = asRecord(item);
            return !!party?.isRepresented || !!party?.isClient;
        });
    const party1Client = sideHasClient(party1);
    const party2Client = sideHasClient(party2);
    if (party1Client && !party2Client) return 'client';
    if (party2Client && !party1Client) return 'opponent';
    if (row.representedParty === 'client' || row.representedParty === 'opponent') return row.representedParty;
    return null;
}

export function mapLegacyCassationFields(row: Record<string, unknown>): Pick<
    UrgentCase,
    | 'cassationOutcome'
    | 'cassationFiledBy'
    | 'cassationFilingDate'
    | 'cassationFileNumber'
    | 'cassationDecision'
    | 'cassationDecisionDate'
> {
    const legacyOutcome = row.appealOutcome;
    const legacyFiledBy = row.appealFiledBy;
    const legacyFilingDate = row.appealFilingDate;
    const legacyFileNumber = row.appealFileNumber;
    const legacyDecision = row.appealDecision;
    const legacyDecisionDate = row.appealDecisionDate;

    return {
        cassationOutcome:
            row.cassationOutcome === 'filed' || row.cassationOutcome === 'expired'
                ? row.cassationOutcome
                : legacyOutcome === 'filed' || legacyOutcome === 'expired'
                  ? legacyOutcome
                  : null,
        cassationFiledBy:
            row.cassationFiledBy === 'client' || row.cassationFiledBy === 'opponent'
                ? row.cassationFiledBy
                : legacyFiledBy === 'client' || legacyFiledBy === 'opponent'
                  ? legacyFiledBy
                  : null,
        cassationFilingDate:
            typeof row.cassationFilingDate === 'string'
                ? row.cassationFilingDate
                : typeof legacyFilingDate === 'string'
                  ? legacyFilingDate
                  : null,
        cassationFileNumber:
            typeof row.cassationFileNumber === 'string'
                ? row.cassationFileNumber
                : typeof legacyFileNumber === 'string'
                  ? legacyFileNumber
                  : null,
        cassationDecision:
            row.cassationDecision === 'confirmed' ||
            row.cassationDecision === 'modified' ||
            row.cassationDecision === 'canceled'
                ? row.cassationDecision
                : legacyDecision === 'confirmed' || legacyDecision === 'modified' || legacyDecision === 'canceled'
                  ? legacyDecision
                  : null,
        cassationDecisionDate:
            typeof row.cassationDecisionDate === 'string'
                ? row.cassationDecisionDate
                : typeof legacyDecisionDate === 'string'
                  ? legacyDecisionDate
                  : null,
    };
}

export function hydrateExpertModule(raw: unknown): ExpertModule | undefined {
    const module = asRecord(raw);
    if (!module) return undefined;
    return {
        enabled: !!module.enabled,
        expertName: typeof module.expertName === 'string' ? module.expertName : '',
        depositAmount: typeof module.depositAmount === 'string' ? module.depositAmount : '',
        inspectionDate: typeof module.inspectionDate === 'string' ? module.inspectionDate : '',
        reportDueDate: typeof module.reportDueDate === 'string' ? module.reportDueDate : '',
        reportReceivedDate: typeof module.reportReceivedDate === 'string' ? module.reportReceivedDate : '',
    };
}

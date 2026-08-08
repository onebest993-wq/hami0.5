import {
    type PersonalCoerciveSubtype,
    type SeizureRequestSubtype,
    type UnifiedCollectionDecisionState,
} from '@/app/utils/executorDecisionContracts';
import {
    findApprovedBreakInventoryNeedingLedgerFromRows,
    findApprovedCustodianNeedingDetailsFromRows,
    findApprovedFieldVisitNeedingScheduleFromRows,
    getCreditorHeirSubstitutionRequestStatusFromRows,
    getDebtorHeirSubstitutionRequestStatusFromRows,
    hasPendingCreditorDeathOnlyReportFromRows,
    hasPendingCreditorPartyDeathRequestFromRows,
    latestExecutorDecisionRow as latestExecutorDecisionRowFromRows,
    type ExecutorDecisionRowLite,
    type HeirSubstitutionRequestStatus,
} from '@/app/utils/executorDecisionSelectors';
import {
    computeGuarantorApprovalMergePatchFromRows,
    getGuarantorRequestOutcomeFromRows,
    getLatestRequestKindDecisionStateFromRows,
    hasApprovedRequestKindFromRows,
    resolveExecutorOutcomeFlags,
} from '@/app/utils/executorDecisionStateSelectors';
import {
    getGoverningDossierPresentationRowFromRows,
    getGoverningPersonalCoerciveSubtypeRowFromRows,
    getGoverningSeizureDecisionBySubtypeFromRows,
    getNewestPersonalCoerciveSubtypeRowFromRows,
    hasActivePersonalCoerciveSubtypeCardFromRows,
} from '@/app/utils/executorRequestGoverningSelectors';
import {
    isExecutorDecisionsStorageKey,
    readExecutorDecisionsUnionForExecution,
} from '@/app/utils/executionDecisionsNamespace';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import { isStorageKeyVisibleToCurrentUser } from '@/app/utils/executionDeviceStorageScope';
import SecureStoreService from '@/app/services/SecureStoreService';

export type ExecutorDecisionRowContext = {
    row: Record<string, unknown>;
    storageExecutionId: string;
};

export type CreditorHeirSubstitutionRequestStatus = HeirSubstitutionRequestStatus;
export type DebtorHeirSubstitutionRequestStatus = HeirSubstitutionRequestStatus;

export function readExecutorDecisionsArray(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): Record<string, unknown>[] {
    try {
        const data = executionData ?? readExecutionDataForDomainGate(executionId);
        return readExecutorDecisionsUnionForExecution(executionId, data);
    } catch {
        return [];
    }
}

export function getExecutorDecisionRowById(
    executionId: string | undefined,
    decisionId: string,
): Record<string, unknown> | null {
    const id = String(decisionId || '').trim();
    if (!id) return null;
    const rows = readExecutorDecisionsArray(executionId);
    return rows.find((row) => String(row.id) === id) ?? null;
}

export function resolveExecutorDecisionRowContext(
    executionId: string | undefined,
    decisionId: string,
): ExecutorDecisionRowContext | null {
    const id = String(decisionId || '').trim();
    if (!id) return null;
    const preferred = String(executionId ?? '').trim();
    if (preferred) {
        const row = getExecutorDecisionRowById(preferred, id);
        if (row) return { row, storageExecutionId: preferred };
    }
    try {
        const keys = SecureStoreService.listKeysSync();
        for (const rawKey of keys) {
            const key = String(rawKey || '').trim();
            if (!isStorageKeyVisibleToCurrentUser(key)) continue;
            if (!isExecutorDecisionsStorageKey(key)) continue;
            let storageExecutionId = '';
            if (key.includes('_decisions_ns_')) {
                const base = key.slice('execution_'.length);
                storageExecutionId = base.split('_decisions_ns_')[0] || '';
            } else if (key.endsWith('_decisions')) {
                storageExecutionId = key.slice('execution_'.length, -'_decisions'.length);
            }
            if (!storageExecutionId || storageExecutionId === preferred) continue;
            const row = getExecutorDecisionRowById(storageExecutionId, id);
            if (row) return { row, storageExecutionId };
        }
    } catch {
        /* ignore */
    }
    return null;
}

export function getLatestSeizureDecisionBySubtype(
    executionId: string | undefined,
    subtype: SeizureRequestSubtype,
): Record<string, unknown> | null {
    const rows = readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[];
    return latestExecutorDecisionRowFromRows(
        rows.filter(
            (row) =>
                String((row as { seizureSubtype?: string }).seizureSubtype || '').trim() ===
                String(subtype || '').trim(),
        ),
    ) as Record<string, unknown> | null;
}

export function getGoverningSeizureDecisionBySubtypeFromDecisions(
    allDecisions: Record<string, unknown>[],
    subtype: SeizureRequestSubtype,
): Record<string, unknown> | null {
    return getGoverningSeizureDecisionBySubtypeFromRows(
        allDecisions as ExecutorDecisionRowLite[],
        subtype,
    );
}

export function getGoverningSeizureDecisionBySubtype(
    executionId: string | undefined,
    subtype: SeizureRequestSubtype,
    allDecisions?: Record<string, unknown>[],
): Record<string, unknown> | null {
    return getGoverningSeizureDecisionBySubtypeFromDecisions(
        allDecisions ?? readExecutorDecisionsArray(executionId),
        subtype,
    );
}

export function hasPendingCreditorDeathOnlyReport(executionId: string | undefined): boolean {
    return hasPendingCreditorDeathOnlyReportFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
    );
}

export function hasPendingCreditorPartyDeathRequest(executionId: string | undefined): boolean {
    return hasPendingCreditorPartyDeathRequestFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
    );
}

export function getCreditorHeirSubstitutionRequestStatus(
    executionId: string | undefined,
): CreditorHeirSubstitutionRequestStatus {
    return getCreditorHeirSubstitutionRequestStatusFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
    );
}

export function getDebtorHeirSubstitutionRequestStatus(
    executionId: string | undefined,
): DebtorHeirSubstitutionRequestStatus {
    return getDebtorHeirSubstitutionRequestStatusFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
    );
}

export function findApprovedFieldVisitNeedingSchedule(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): { decisionId: string; requestTitle: string } | null {
    return findApprovedFieldVisitNeedingScheduleFromRows(
        readExecutorDecisionsArray(executionId, executionData) as ExecutorDecisionRowLite[],
    );
}

export function findApprovedBreakInventoryNeedingLedger(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): { decisionId: string; requestTitle: string } | null {
    return findApprovedBreakInventoryNeedingLedgerFromRows(
        readExecutorDecisionsArray(executionId, executionData) as ExecutorDecisionRowLite[],
    );
}

export function findApprovedCustodianNeedingDetails(
    executionId: string | undefined,
    executionData?: Record<string, unknown> | null,
): { decisionId: string; requestTitle: string } | null {
    return findApprovedCustodianNeedingDetailsFromRows(
        readExecutorDecisionsArray(executionId, executionData) as ExecutorDecisionRowLite[],
    );
}

export function getGoverningPersonalCoerciveSubtypeRowFromDecisions(
    allDecisions: Record<string, unknown>[],
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string },
): Record<string, unknown> | null {
    return getGoverningPersonalCoerciveSubtypeRowFromRows(
        allDecisions as ExecutorDecisionRowLite[],
        subtype,
        opts,
    );
}

export function getGoverningDossierPresentationRowFromDecisions(
    allDecisions: Record<string, unknown>[],
    opts?: { debtorKey?: string; primaryDebtorKey?: string },
): Record<string, unknown> | null {
    return getGoverningDossierPresentationRowFromRows(
        allDecisions as ExecutorDecisionRowLite[],
        opts,
    );
}

export function getNewestPersonalCoerciveSubtypeRow(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string },
): Record<string, unknown> | null {
    return getNewestPersonalCoerciveSubtypeRowFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
        subtype,
        opts,
    );
}

export function getGoverningDossierPresentationRow(
    executionId: string | undefined,
    opts?: { debtorKey?: string; primaryDebtorKey?: string },
): Record<string, unknown> | null {
    return getGoverningDossierPresentationRowFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
        opts,
    );
}

export function getDossierPresentationOutcome(
    executionId: string | undefined,
    opts?: { debtorKey?: string; primaryDebtorKey?: string },
): { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean } {
    return resolveExecutorOutcomeFlags(
        getGoverningDossierPresentationRow(executionId, opts) as ExecutorDecisionRowLite,
    );
}

export function getGoverningPersonalCoerciveSubtypeRow(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string },
): Record<string, unknown> | null {
    return getGoverningPersonalCoerciveSubtypeRowFromDecisions(
        readExecutorDecisionsArray(executionId),
        subtype,
        opts,
    );
}

export function hasActivePersonalCoerciveSubtypeCard(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string },
): boolean {
    return hasActivePersonalCoerciveSubtypeCardFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
        subtype,
        opts,
    );
}

export function getPersonalCoerciveSubtypeOutcome(
    executionId: string | undefined,
    subtype: PersonalCoerciveSubtype,
    opts?: { debtorKey?: string; primaryDebtorKey?: string },
): { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean } {
    return resolveExecutorOutcomeFlags(
        getGoverningPersonalCoerciveSubtypeRow(executionId, subtype, opts) as ExecutorDecisionRowLite,
    );
}

export function getGuarantorRequestOutcome(
    executionId: string | undefined,
): { pending: boolean; approved: boolean; rejected: boolean; alternative: boolean } {
    return getGuarantorRequestOutcomeFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
    );
}

export function hasApprovedLawyerFeePayout(executionId: string | undefined): boolean {
    return hasApprovedRequestKindFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
        'lawyer_fee_payout',
    );
}

export function hasApprovedUnifiedCollection(executionId: string | undefined): boolean {
    return hasApprovedRequestKindFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
        'unified_collection',
    );
}

export function getLatestUnifiedCollectionDecisionState(
    executionId: string | undefined,
): UnifiedCollectionDecisionState {
    return getLatestRequestKindDecisionStateFromRows(
        readExecutorDecisionsArray(executionId) as ExecutorDecisionRowLite[],
        'unified_collection',
    );
}

export function computeGuarantorApprovalMergePatch(
    decisionsStorageExecutionId: string | undefined,
    executionData: unknown,
): Record<string, unknown> {
    const executionId = resolveDecisionsStorageExecutionId(
        decisionsStorageExecutionId,
        executionData as Record<string, unknown> | null | undefined,
    );
    const execId = String(executionId ?? decisionsStorageExecutionId ?? '').trim();
    if (!execId) return {};
    return computeGuarantorApprovalMergePatchFromRows(
        readExecutorDecisionsArray(execId) as ExecutorDecisionRowLite[],
        executionData as Record<string, unknown> | null | undefined,
    );
}

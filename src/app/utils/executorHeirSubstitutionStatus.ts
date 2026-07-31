import {
    getCreditorHeirSubstitutionRequestStatusFromRows,
    getDebtorHeirSubstitutionRequestStatusFromRows,
    type ExecutorDecisionRowLite,
    type HeirSubstitutionRequestStatus,
} from '@/app/utils/executorDecisionSelectors';
import { readExecutorDecisionsUnionForExecution } from '@/app/utils/executionDecisionsNamespace';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';

export type CreditorHeirSubstitutionRequestStatus = HeirSubstitutionRequestStatus;
export type DebtorHeirSubstitutionRequestStatus = HeirSubstitutionRequestStatus;

function readExecutorDecisionRows(
    executionId: string | undefined,
): ExecutorDecisionRowLite[] {
    try {
        return readExecutorDecisionsUnionForExecution(
            executionId,
            readExecutionDataForDomainGate(executionId),
        ) as ExecutorDecisionRowLite[];
    } catch {
        return [];
    }
}

export function getCreditorHeirSubstitutionRequestStatus(
    executionId: string | undefined,
): CreditorHeirSubstitutionRequestStatus {
    return getCreditorHeirSubstitutionRequestStatusFromRows(
        readExecutorDecisionRows(executionId),
    );
}

export function getDebtorHeirSubstitutionRequestStatus(
    executionId: string | undefined,
): DebtorHeirSubstitutionRequestStatus {
    return getDebtorHeirSubstitutionRequestStatusFromRows(
        readExecutorDecisionRows(executionId),
    );
}

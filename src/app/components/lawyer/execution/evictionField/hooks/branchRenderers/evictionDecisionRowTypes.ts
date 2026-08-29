import type { EvictionExecutorWorkflowKey } from '@/app/utils/executorApprovalWorkflow';

export type EvictionDecisionRow = Record<string, unknown> & {
    id?: string;
    title?: string;
    executorOutcome?: string;
    executorScheduleLabel?: string;
    executorNote?: string;
    evictionWorkflowKey?: EvictionExecutorWorkflowKey;
    policeAssistanceSavedAt?: string;
    policeAssistanceAgency?: string;
    judicialCustodianDetailsSavedAt?: string;
    judicialCustodianName?: string;
    judicialCustodianSalary?: string;
    breakInventoryFurnitureFinalizedAt?: string;
    breakInventoryFurnitureLedgerAt?: string;
};

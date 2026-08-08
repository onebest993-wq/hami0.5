import type { ExecutionFile } from '@/app/types/execution';
import { normalizeDossierLifecycleStatus } from '@/app/types/execution';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import {
    deriveExecutionAttentionSignals,
    type ExecutionAttentionSignals,
    type ExecutionVoluntaryGap,
} from '@/app/spark/engine/executionAttentionSignals';
import type { ExecutionSparkRuntimeOverlay } from '@/app/spark/context/executionSparkRuntimeOverlay';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import {
    resolveExecutionFinancialSparkSignals,
    type ExecutionFinancialSparkSignals,
} from '@/app/spark/engine/executionFinancialSparkBridge';

export type { ExecutionAttentionSignals, ExecutionVoluntaryGap };
export type { ExecutionSparkRuntimeOverlay, ExecutionFinancialSparkSignals };

export type ExecutionSparkContext = {
    dossierKey: string;
    fileId: string;
    executionData: ExecutionFile;
    lifecycleStatus: ReturnType<typeof normalizeDossierLifecycleStatus>;
    executionPaused: boolean;
    pendingExecutorDecisionCount: number;
    voluntaryPeriodGap: ExecutionVoluntaryGap | null;
    detentionJudgePending: boolean;
    signals: ExecutionAttentionSignals;
    financialSignals: ExecutionFinancialSparkSignals;
    runtimeOverlay?: ExecutionSparkRuntimeOverlay;
    /** مرفقات خزنة مربوطة — OCR → تماسك (تجريبي) */
    boundVaultDocs?: SmartVaultDoc[];
};

function countPendingExecutorDecisions(executionId: string): number {
    const rows = readExecutorDecisionsArray(executionId);
    return rows.filter((row) => {
        const out = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending');
        return out === 'pending' || !out;
    }).length;
}

export function buildExecutionSparkContext(params: {
    executionData: ExecutionFile;
    executionPaused?: boolean;
    decisionsStorageExecutionId?: string;
    runtimeOverlay?: ExecutionSparkRuntimeOverlay;
    boundVaultDocs?: SmartVaultDoc[];
}): ExecutionSparkContext {
    const file = params.executionData;
    const fileId = String(file.id ?? 'unknown');
    const caseNo = String(file.executionCaseNumber ?? file.caseNo ?? file.fileNumber ?? '').trim();
    const dossierKey = caseNo ? `execution:${caseNo}` : `execution:${fileId}`;

    const lifecycleStatus = normalizeDossierLifecycleStatus(file.dossier_lifecycle_status);
    const storageId = String(params.decisionsStorageExecutionId ?? fileId).trim() || fileId;
    const signals = deriveExecutionAttentionSignals(
        file,
        params.runtimeOverlay,
        storageId,
    );

    const financialSignals = resolveExecutionFinancialSparkSignals({
        file,
        decisionsStorageExecutionId: storageId,
        runtimeOverlay: params.runtimeOverlay,
    });

    const eligibleDecisionId = String(file.executive_detention_judge_eligible_decision_id ?? '').trim();
    const judgeOutcome = file.executive_detention_judge_outcome;

    const voluntaryPeriodGap =
        signals.evictionVoluntaryGap ?? signals.voluntaryPeriodGap ?? null;

    return {
        dossierKey,
        fileId,
        executionData: file,
        lifecycleStatus,
        executionPaused: Boolean(params.executionPaused),
        pendingExecutorDecisionCount: countPendingExecutorDecisions(storageId),
        voluntaryPeriodGap,
        detentionJudgePending: Boolean(eligibleDecisionId && !judgeOutcome),
        signals,
        financialSignals,
        runtimeOverlay: params.runtimeOverlay,
        boundVaultDocs: params.boundVaultDocs,
    };
}

import type { ExecutionFollowupOrchestratorSlice } from '../../orchestrators/executionFollowupOrchestratorTypes';
import type { ExecutionSeizureOrchestratorSlice } from '../../orchestrators/executionSeizureOrchestratorTypes';
import type { ExecutionCoercionOrchestratorSlice } from '../../orchestrators/executionCoercionOrchestratorTypes';
import type { ExecutionDossierLifecyclePanelOrchestratorSlice } from '../../orchestrators/executionOrchestratorSliceTypes';
import type { ExecutionDecisionsOrchestratorSlice } from '../../orchestrators/executionDecisionsOrchestratorTypes';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';

export type HandlerClusterContextSpreads = {
    followupOrchestrator: ExecutionFollowupOrchestratorSlice;
    seizureOrchestrator: ExecutionSeizureOrchestratorSlice;
    coercionOrchestrator: ExecutionCoercionOrchestratorSlice;
    dossierLifecyclePanel: ExecutionDossierLifecyclePanelOrchestratorSlice;
    claimFinancials: object;
    graceAndSummoning: object;
    debtorWorkspaceContext: object;
    subsequentNoticeFlow: object;
    followupTabAssembly: object;
    followupSeizureTabs: object;
    decisionsOrchestrator: ExecutionDecisionsOrchestratorSlice;
    core: ExecutionDashboardCoreWorkspacePipelineValue;
};

/** نتيجة تسطيح حقائب المنظّم — مصدر حقيقة حقول المعالجات. */
export type HandlerClusterFlatContext = ExecutionDashboardCoreWorkspacePipelineValue &
    ExecutionFollowupOrchestratorSlice &
    ExecutionSeizureOrchestratorSlice &
    ExecutionCoercionOrchestratorSlice &
    ExecutionDossierLifecyclePanelOrchestratorSlice &
    ExecutionDecisionsOrchestratorSlice;

export function asHandlerClusterSpreads(input: object): HandlerClusterContextSpreads {
    return input as unknown as HandlerClusterContextSpreads;
}

export function asPickedHandlerClusterContext(value: Record<string, unknown>): HandlerClusterFlatContext {
    return value as unknown as HandlerClusterFlatContext;
}

/** سلك الجسر: حقائب متداخلة، حقيبة مسطّحة، أو فارغ قبل التحميل. */
export type HandlerClusterBridgeInput = object;

export function collectFullHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): HandlerClusterFlatContext {
    return {
        ...spreads.core,
        ...spreads.followupOrchestrator,
        ...spreads.seizureOrchestrator,
        ...spreads.coercionOrchestrator,
        ...spreads.dossierLifecyclePanel,
        ...spreads.claimFinancials,
        ...spreads.graceAndSummoning,
        ...spreads.debtorWorkspaceContext,
        ...spreads.subsequentNoticeFlow,
        ...spreads.followupTabAssembly,
        ...spreads.followupSeizureTabs,
        ...spreads.decisionsOrchestrator,
    } as HandlerClusterFlatContext;
}

export function pickHandlerClusterKeys(
    bags: ReadonlyArray<object>,
    keys: readonly string[],
): HandlerClusterFlatContext {
    const out: Record<string, unknown> = {};
    for (const bag of bags) {
        if (!bag || typeof bag !== 'object') continue;
        const rec = bag as Record<string, unknown>;
        for (const key of keys) {
            if (key in rec) out[key] = rec[key];
        }
    }
    return asPickedHandlerClusterContext(out);
}

export function handlerClusterSourceBags(
    spreads: HandlerClusterContextSpreads,
): ReadonlyArray<object> {
    return [
        spreads.core,
        spreads.followupOrchestrator,
        spreads.seizureOrchestrator,
        spreads.coercionOrchestrator,
        spreads.dossierLifecyclePanel,
        spreads.claimFinancials,
        spreads.graceAndSummoning,
        spreads.debtorWorkspaceContext,
        spreads.subsequentNoticeFlow,
        spreads.followupTabAssembly,
        spreads.followupSeizureTabs,
        spreads.decisionsOrchestrator,
    ];
}

/**
 * يقرأ قيمة من input الجسور دون تسطيح كامل — input هو bag-of-bags
 * (followupOrchestrator/…/core) وليس سياقاً مسطّحاً، لذا الوصول المباشر
 * input.someFlag يعيد undefined دائماً. الأسبقية توافق collectFullHandlerClusterContext
 * (الحقيبة اللاحقة تتغلّب على السابقة).
 */
export function readHandlerClusterContextValue(
    input: object,
    key: string,
): unknown {
    const rec = input as Record<string, unknown>;
    if (key in rec) return rec[key];
    let out: unknown;
    for (const bag of handlerClusterSourceBags(input as HandlerClusterContextSpreads)) {
        if (bag && typeof bag === 'object' && key in bag) {
            out = (bag as Record<string, unknown>)[key];
        }
    }
    return out;
}

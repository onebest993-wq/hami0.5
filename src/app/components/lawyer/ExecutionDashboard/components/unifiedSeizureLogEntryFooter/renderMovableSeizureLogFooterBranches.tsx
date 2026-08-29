import React from 'react';
import type { SeizedMovable } from '@/app/types/execution';
import { SeizedMovableWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedMovableWorkflowPanel';
import { MovableSeizureInitInlineCard } from '@/app/components/lawyer/ExecutionDashboard/components/MovableSeizureInitInlineCard';
import {
    coalesceDecisionsStorageExecutionId,
    requireDecisionsStorageExecutionId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import {
    resolveExecutorDecisionRow,
    isExecutorDecisionRowPending,
    SeizureDecisionPendingMirrorFooter,
    dispatchFooterSeizureAction,
    inferMovableWorkflowStatus,
    inferSeizureWorkflowStatusFromLogEntry,
} from './unifiedSeizureLogEntryFooterHelpers';
import type { UnifiedSeizureLogFooterBranchCtx } from './UnifiedSeizureLogFooterBranchCtx';

export function renderMovableSeizureLogFooterBranches(
    ctx: UnifiedSeizureLogFooterBranchCtx,
): React.ReactNode | undefined {
    const { props, entry, seizedMovablesForSeizureLog, movableInlineSaveCtx, movableSeizureRegistryAssets } = ctx;
        if (entry.id.startsWith('movable_entity:') && entry.entityId) {
            const mid = String(entry.entityId).trim();
            const mFromList = seizedMovablesForSeizureLog.find((x) => String(x.id) === mid);
            const m =
                mFromList ??
                ({
                    id: mid,
                    status: inferSeizureWorkflowStatusFromLogEntry(entry),
                } as SeizedMovable);
            const rawStatus = String(m?.status || '');
            const status = inferMovableWorkflowStatus(rawStatus);
            return (
                <SeizedMovableWorkflowPanel
                    movable={m}
                    workflowStatus={status}
                    decisionsStorageExecutionId={requireDecisionsStorageExecutionId({
                        decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                        executionId: props.executionId,
                        executionDataId: props.executionData?.id,
                        executionData: props.executionData as Record<string, unknown> | null,
                    })}
                    executionId={props.executionId}
                    executionDataId={props.executionData?.id}
                    executionData={props.executionData as Record<string, unknown> | null}
                    decisions={props.seizureLogExecutorDecisions}
                    movables={seizedMovablesForSeizureLog}
                    movableInlineSaveCtx={movableInlineSaveCtx}
                    showToast={props.showToast}
                    decisionsReloadEpoch={props.decisionsReloadEpoch}
                    appealPerspective={props.appealPerspective}
                />
            );
        }

        if (entry.id.startsWith('movable:') && entry.entityId) {
            const assetId = String(entry.entityId).trim();
            const asset = movableSeizureRegistryAssets.find((a) => String(a.id) === assetId);
            const det =
                typeof asset?.details === 'object' && asset.details && !Array.isArray(asset.details)
                    ? (asset.details as Record<string, unknown>)
                    : null;
            const did = String(det?.decisionRowId || '').trim();
            const seized =
                seizedMovablesForSeizureLog.find(
                    (x) =>
                        String(x.id) === assetId ||
                        (did && String(x.decisionRowId || '').trim() === did),
                ) || null;
            if (!did && !seized) return null;
            return (
                <MovableSeizureInitInlineCard
                    decisionId={did || String(seized?.decisionRowId || '').trim()}
                    subject={entry.title}
                    seizedMovable={seized}
                    movables={seizedMovablesForSeizureLog}
                    movableInlineSaveCtx={movableInlineSaveCtx}
                    saveSeizedMovableInitForDecision={props.saveSeizedMovableInitForDecision}
                    decisionsStorageExecutionId={props.decisionsStorageExecutionId}
                    executionId={props.executionId}
                    executionDataId={props.executionData?.id}
                    executionData={props.executionData as Record<string, unknown> | null}
                    decisions={props.seizureLogExecutorDecisions}
                    showToast={props.showToast}
                    decisionsReloadEpoch={props.decisionsReloadEpoch}
                    appealPerspective={props.appealPerspective}
                />
            );
        }

        if (entry.id.startsWith('movable_decision:')) {
            const did = String(entry.entityId || '').trim();
            if (!did) return null;
            const seized = seizedMovablesForSeizureLog.find(
                (x) => String(x.decisionRowId || '').trim() === did,
            );
            return (
                <MovableSeizureInitInlineCard
                    decisionId={did}
                    subject={entry.title}
                    seizedMovable={seized}
                    movables={seizedMovablesForSeizureLog}
                    movableInlineSaveCtx={movableInlineSaveCtx}
                    saveSeizedMovableInitForDecision={props.saveSeizedMovableInitForDecision}
                    decisionsStorageExecutionId={props.decisionsStorageExecutionId}
                    executionId={props.executionId}
                    executionDataId={props.executionData?.id}
                    executionData={props.executionData as Record<string, unknown> | null}
                    decisions={props.seizureLogExecutorDecisions}
                    showToast={props.showToast}
                    decisionsReloadEpoch={props.decisionsReloadEpoch}
                    appealPerspective={props.appealPerspective}
                />
            );
        }

        if (entry.id.startsWith('guarantor_decision:')) {
            const did = String(entry.entityId || '').trim();
            const exId = coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                executionId: props.executionId,
                executionData: props.executionData as Record<string, unknown> | null,
            });
            const focusKind = entry.kind;
            if (!did || !exId || focusKind === 'third_party' || focusKind === 'marks') return null;
            const row = resolveExecutorDecisionRow(props.seizureLogExecutorDecisions, did);
            const pendingMirror = (
                <SeizureDecisionPendingMirrorFooter
                    executionId={exId}
                    decisionId={did}
                    row={row}
                    appealPerspective={props.appealPerspective}
                />
            );
            if (isExecutorDecisionRowPending(row)) return pendingMirror;
            return (
                <>
                    {pendingMirror}
                    <button
                        type="button"
                        onClick={() =>
                            dispatchFooterSeizureAction(
                                exId,
                                did,
                                'guarantor',
                                entry.title,
                                focusKind as 'salary' | 'movable' | 'property',
                            )
                        }
                        className="w-full rounded-2xl border border-rose-400/35 bg-rose-500/15 px-3 py-3 text-[11px] font-black text-rose-100 hover:bg-rose-500/22"
                    >
                        إكمال بيانات حجز الكفيل
                    </button>
                </>
            );
        }

    return undefined;
}

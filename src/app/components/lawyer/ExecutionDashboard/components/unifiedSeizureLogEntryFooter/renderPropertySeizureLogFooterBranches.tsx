import React from 'react';
import type { SeizedProperty, SeizedAsset } from '@/app/types/execution';
import { SeizedPropertyWorkflowPanel } from '@/app/components/lawyer/ExecutionDashboard/components/SeizedPropertyWorkflowPanel';
import {
    coalesceDecisionsStorageExecutionId,
    requireDecisionsStorageExecutionId,
} from '@/app/components/lawyer/ExecutionDashboard/utils/requireDecisionsStorageExecutionId';
import {
    resolveExecutorDecisionRow,
    isExecutorDecisionRowPending,
    SeizureDecisionPendingMirrorFooter,
    dispatchFooterSeizureAction,
    inferSeizureWorkflowStatusFromLogEntry,
    inferPropertyWorkflowStatus,
    SeizureWorkflowLoadingShell,
} from './unifiedSeizureLogEntryFooterHelpers';
import type { UnifiedSeizureLogFooterBranchCtx } from './UnifiedSeizureLogFooterBranchCtx';

export function renderPropertySeizureLogFooterBranches(
    ctx: UnifiedSeizureLogFooterBranchCtx,
): React.ReactNode | undefined {
    const { props, entry, seizedPropertiesForSeizureLog, realEstateSeizureRegistryAssets } = ctx;
        if (entry.id.startsWith('property:')) {
            const pid = String(entry.entityId || '').trim();
            const pFromList = seizedPropertiesForSeizureLog.find((x) => String(x.id) === pid);
            const p =
                pFromList ??
                (pid
                    ? ({
                          id: pid,
                          status: inferSeizureWorkflowStatusFromLogEntry(entry),
                      } as SeizedProperty)
                    : null);
            if (!p) {
                return <SeizureWorkflowLoadingShell />;
            }
            const rawStatus = String(p?.status || '');
            const status = inferPropertyWorkflowStatus(rawStatus);
            return (
                <SeizedPropertyWorkflowPanel
                    property={p}
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
                    properties={seizedPropertiesForSeizureLog}
                    propertyInlineSaveCtx={props.propertyInlineSaveCtx}
                    decisionsReloadEpoch={props.decisionsReloadEpoch}
                    appealPerspective={props.appealPerspective}
                    showToast={props.showToast}
                    onOpenAppeals={(did) => {
                        try {
                            window.dispatchEvent(
                                new CustomEvent('hami-open-decisions-modal', {
                                    detail: {
                                        executionId: props.decisionsStorageExecutionId,
                                        tab: 'previous',
                                        decisionId: did,
                                    },
                                })
                            );
                        } catch {
                            /* ignore */
                        }
                    }}
                />
            );
        }

        if (entry.id.startsWith('property_decision:')) {
            const did = String(entry.entityId || '').trim();
            const exId = coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                executionId: props.executionId,
                executionData: props.executionData as Record<string, unknown> | null,
            });
            if (!did || !exId) return null;
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
                            dispatchFooterSeizureAction(exId, did, 'property', entry.title)
                        }
                        className="w-full rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-3 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/22"
                    >
                        إكمال بيانات العقار وبدء الإجراءات
                    </button>
                </>
            );
        }

        if (entry.id.startsWith('real_estate:')) {
            const eid = String(entry.entityId || '').trim();
            const asset =
                realEstateSeizureRegistryAssets.find(
                    (a) =>
                        String(a?.id || '').trim() === eid ||
                        String(a?.decisionRowId || '').trim() === eid
                ) || null;
            const did = String(asset?.decisionRowId || '').trim();
            if (!did) return null;
            const exId = coalesceDecisionsStorageExecutionId({
                decisionsStorageExecutionId: props.decisionsStorageExecutionId,
                executionId: props.executionId,
                executionData: props.executionData as Record<string, unknown> | null,
            });
            const row = resolveExecutorDecisionRow(props.seizureLogExecutorDecisions, did);
            const pendingMirror =
                exId ? (
                    <SeizureDecisionPendingMirrorFooter
                        executionId={exId}
                        decisionId={did}
                        row={row}
                        appealPerspective={props.appealPerspective}
                    />
                ) : null;
            if (isExecutorDecisionRowPending(row)) return pendingMirror;
            return (
                <>
                    {pendingMirror}
                    <button
                        type="button"
                        onClick={() => {
                            if (!exId) return;
                            dispatchFooterSeizureAction(exId, did, 'property', entry.title);
                        }}
                        className="w-full rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-3 py-3 text-[11px] font-black text-emerald-100 hover:bg-emerald-500/22"
                    >
                        إكمال بيانات العقار وبدء الإجراءات
                    </button>
                </>
            );
        }

    return undefined;
}

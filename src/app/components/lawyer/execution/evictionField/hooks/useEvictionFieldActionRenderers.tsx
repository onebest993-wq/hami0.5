import React from 'react';
import {
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRequestAppealCycleSupersededFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { ExecutionInlineExecutorDecisionActions } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';

import type { EvictionAppealSyncView } from '@/app/utils/evictionAppealSync';

export function useEvictionFieldActionRenderers(input: {
    resolvePanelExecutionId: () => string;
    openAppeals: (decisionId: string) => void;
    handleWaiveCassationFromPanel: (decisionId: string) => void;
    syncForBranch: (branch: string) => EvictionAppealSyncView;
    decisions: unknown;
    decisionList: unknown[];
    branchFollowupBlocked: (branch: string) => boolean;
    locked: boolean;
    toast: (message: string, type?: string) => void;
    setInlineExpandedByBranch: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
    const {
        resolvePanelExecutionId,
        openAppeals,
        handleWaiveCassationFromPanel,
        syncForBranch,
        decisions,
        decisionList,
        branchFollowupBlocked,
        locked,
        toast,
        setInlineExpandedByBranch,
    } = input;

const renderBranchExecutorActionsStrip = React.useCallback(
        (
            branch: string,
            row: Record<string, unknown>,
            heading: string,
            options?: { disabled?: boolean; onOpenAppealCenter?: () => void }
        ) => {
            const decisionId = String((row as { id?: string }).id || '').trim();
            if (!decisionId) return null;
            const execId = resolvePanelExecutionId();
            if (!execId) return null;
            const rejected = isExecutorRowRejectedAndFinal(row);
            const disabled = options?.disabled ?? rejected;
            const onOpenAppealCenter =
                options?.onOpenAppealCenter ?? (rejected ? () => openAppeals(decisionId) : undefined);

            return (
                <div className="border-t border-white/10 px-3 py-3">
                    <div className="space-y-2 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-3">
                        <p className="text-[11px] font-black text-right text-amber-100">{heading}</p>
                        <ExecutionInlineExecutorDecisionActions
                            executionId={execId}
                            decisionId={decisionId}
                            decisionRow={row}
                            requestKind="eviction_procedure"
                            disabled={disabled}
                            onOpenAppealCenter={onOpenAppealCenter}
                        />
                    </div>
                </div>
            );
        },
        [openAppeals, resolvePanelExecutionId]
    );

    const renderAppealSyncFollowup = React.useCallback(
        (sync: EvictionAppealSyncView) => {
            if (!sync.followupBlock || !sync.decisionId) return null;
            const execId = resolvePanelExecutionId();
            if (!execId) return null;
            return (
                <ExecutorRequestFollowupBlockPanel
                    gate={sync.followupBlock}
                    executionId={execId}
                    decisionId={sync.decisionId}
                    onOpenAppeals={openAppeals}
                    onWaiveCassation={handleWaiveCassationFromPanel}
                />
            );
        },
        [handleWaiveCassationFromPanel, openAppeals, resolvePanelExecutionId]
    );

    const renderFollowupBlockStrip = React.useCallback(
        (branch: string) => {
            const sync = syncForBranch(branch);
            const panel = renderAppealSyncFollowup(sync);
            if (!panel) return null;
            return <div className="border-t border-white/10 px-3 py-3">{panel}</div>;
        },
        [renderAppealSyncFollowup, syncForBranch]
    );

    const renderPendingDecisionStrip = React.useCallback(
        (branch: string) => {
            const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
            const row = getGoverningEvictionProcedureRowForBranch(list, branch);
            if (!row?.id || !isEvictionProcedureRowPending(row) || !isEvictionProcedureRowActive(row, list)) {
                return null;
            }
            return renderBranchExecutorActionsStrip(branch, row, 'قرار المنفذ — قيد البت');
        },
        [decisions, renderBranchExecutorActionsStrip]
    );

    const renderRejectedBranchNotice = React.useCallback(
        (branch: string, _onResubmit: () => void) => {
            const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
            const row = getGoverningEvictionProcedureRowForBranch(list, branch);
            if (!row?.id || !isExecutorRowRejectedAndFinal(row)) return null;
            if (isExecutorRequestAppealCycleSupersededFromRecord(row, list)) return null;
            if (branchFollowupBlocked(branch)) return null;
            const decisionId = String(row.id || '').trim();
            const execId = resolvePanelExecutionId();
            if (!decisionId || !execId) return null;
            return (
                <div className="border-t border-white/10 px-3 py-3">
                    <div className="space-y-2 rounded-2xl border border-rose-500/25 bg-rose-950/20 p-3 text-right">
                        <p className="text-[11px] font-black text-rose-100">تم رفض آخر طلب لهذا الإجراء</p>
                        <ExecutionInlineExecutorDecisionActions
                            executionId={execId}
                            decisionId={decisionId}
                            decisionRow={row}
                            requestKind="eviction_procedure"
                            disabled
                            suppressNavigatorToast
                            onOpenAppealCenter={() => openAppeals(decisionId)}
                        />
                        <WaiveInitialAppealButton
                            executionId={execId}
                            decisionId={decisionId}
                            allDecisions={decisionList}
                            disabled={locked}
                            onApplied={(result) => {
                                if (!result.ok) {
                                    toast(result.message ?? 'تعذّر تسجيل الاستغناء عن الطعن.', 'warning');
                                    return;
                                }
                                toast(result.message ?? 'لا حاجة للطعن — أُغلقت دورة الطلب.', 'success');
                                setInlineExpandedByBranch({});
                            }}
                        />
                    </div>
                </div>
            );
        },
        [branchFollowupBlocked, decisionList, decisions, locked, openAppeals, resolvePanelExecutionId, toast]
    );

    return {
        renderBranchExecutorActionsStrip,
        renderAppealSyncFollowup,
        renderFollowupBlockStrip,
        renderPendingDecisionStrip,
        renderRejectedBranchNotice,
    };
}

import React, { useMemo } from 'react';
import {
    EVICTION_TIMELINE_ACTION_IDS,
    type EvictionTimelineActionId,
} from '@/app/utils/executionModuleStrategies';
import { EVICTION_WORKFLOW_BY_ACTION_ID } from '@/app/utils/executorApprovalWorkflow';
import {
    appendEvictionExecutorRequest,
    dispatchDecisionsReload,
    getGoverningEvictionProcedureRowForBranch,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowActive,
    isExecutorRowRejectedAndFinal,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRequestAppealCycleSupersededFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    assertEvictionBranchSubmitAllowed,
    EVICTION_ACTION_TO_APPEAL_BRANCH,
    resolveBreakInventoryWorkflowComplete,
} from '@/app/utils/evictionBranchSignals';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import { branchRowNeedsPostApprovalInlineWork } from '../utils/branchRowNeedsPostApprovalInlineWork';
import { isJudicialCustodianRowDetailsComplete } from '../utils/isJudicialCustodianRowDetailsComplete';
import type { EvictionFieldProceduresPanelProps } from '../types';
import type { useEvictionFieldPanelState } from './useEvictionFieldPanelState';
import type { useEvictionFieldDecisions } from './useEvictionFieldDecisions';
import { useEvictionFieldActionRenderers } from './useEvictionFieldActionRenderers';

export function useEvictionFieldActions(
    props: EvictionFieldProceduresPanelProps,
    state: ReturnType<typeof useEvictionFieldPanelState>,
    decisionsApi: ReturnType<typeof useEvictionFieldDecisions>,
) {
    const {
        locked,
        decisionsStorageExecutionId,
        executionData = null,
        onRecordAction,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
    } = props;

    const {
        setInlineExpandedByBranch,
        setInlineActionGateKey,
    } = state;

    const {
        decisionsExecId,
        decisions,
        toast,
        decisionList,
        decisionRecords,
        resolvedExistingJudicialCustodians,
        appealSync,
        syncForBranch,
    } = decisionsApi;

    const fire = React.useCallback(
        (actionId: EvictionTimelineActionId, title: string, description: string) => {
            if (locked) return;
            const branch = EVICTION_ACTION_TO_APPEAL_BRANCH[actionId];
            if (branch) {
                const sync = appealSync[branch];
                if (sync?.blocksFieldwork) {
                    toast(
                        sync.followupBlock?.message ??
                            'الإجراء موقوف — أكمل مسار الطعن من مركز القرارات.',
                        'warning'
                    );
                    return;
                }
            }
            if (
                actionId === EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY &&
                tryOpenPendingBreakInventoryLedger?.()
            ) {
                return;
            }
            if (
                actionId === EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN &&
                tryOpenPendingCustodianDetails?.()
            ) {
                return;
            }
            if (typeof onRecordAction === 'function') {
                onRecordAction({ actionId, title, description });
            }
        },
        [
            appealSync,
            locked,
            onRecordAction,
            toast,
            tryOpenPendingBreakInventoryLedger,
            tryOpenPendingCustodianDetails,
        ]
    );

    const click =
        (actionId: EvictionTimelineActionId, title: string, description: string) =>
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            fire(actionId, title, description);
        };

    const EVICTION_BRANCH_KEYS = useMemo(
        () =>
            [
                'Field Visit Date',
                'Police Assistance Request',
                'Residential Grace Early End',
                'Lock Breaking & Inventory',
                'Judicial Custodian',
            ] as const,
        []
    );

    const branchFollowupBlock = React.useCallback(
        (branch: string) => syncForBranch(branch).followupBlock,
        [syncForBranch]
    );

    const branchFollowupBlocked = React.useCallback(
        (branch: string) => syncForBranch(branch).blocked,
        [syncForBranch]
    );

    const branchAppealCycleSuperseded = React.useCallback(
        (branch: string) => syncForBranch(branch).cycleSuperseded,
        [syncForBranch]
    );

    const resolvePanelExecutionId = React.useCallback(
        () =>
            String(decisionsExecId || decisionsStorageExecutionId || '')
                .trim()
                .replace(/^undefined$/, ''),
        [decisionsExecId, decisionsStorageExecutionId]
    );

    const handleWaiveCassationFromPanel = React.useCallback(
        (decisionId: string) => {
            const execId = resolvePanelExecutionId();
            if (!execId || locked) return;
            const result = applyWaiveCassationAfterDebtorGrievanceForExecution({
                executionId: execId,
                decisionId,
            });
            if (!result.ok) {
                toast(result.message ?? 'تعذّر تسجيل الاستغناء عن التمييز.', 'warning');
                return;
            }
            toast(result.message ?? 'قُبل التظلم دون تمييز — انتهت دورة الطلب.', 'success');
            setInlineExpandedByBranch({});
        },
        [locked, resolvePanelExecutionId, toast]
    );

    const openAppeals = React.useCallback(
        (decisionId: string) => {
            if (!decisionsExecId || !decisionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: { executionId: decisionsExecId, tab: 'previous', decisionId },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [decisionsExecId]
    );

    const branchHasExistingHubRequest = React.useCallback(
        (branch: string) => {
            const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
            return isEvictionBranchResendBlocked(list, { branch });
        },
        [decisions]
    );

    const isBranchWorkflowComplete = React.useCallback(
        (branch: string) => Boolean(syncForBranch(branch).workflowComplete),
        [syncForBranch]
    );

    const breakInventoryWorkflowComplete = React.useMemo(
        () =>
            resolveBreakInventoryWorkflowComplete(
                decisionRecords,
                Boolean(appealSync['Lock Breaking & Inventory']?.workflowComplete),
            ),
        [appealSync, decisionRecords],
    );

    const isBranchNeedsCompletion = React.useCallback(
        (branch: string) => {
            const sync = syncForBranch(branch);
            if (sync.blocksFieldwork || sync.cycleSuperseded) return false;
            const row = sync.governingRow;
            if (!row) return false;
            if (
                branch === 'Judicial Custodian' &&
                isJudicialCustodianRowDetailsComplete(row, resolvedExistingJudicialCustodians)
            ) {
                return false;
            }
            return branchRowNeedsPostApprovalInlineWork(branch, row, decisionRecords);
        },
        [decisionRecords, resolvedExistingJudicialCustodians, syncForBranch]
    );

    const {
        renderBranchExecutorActionsStrip,
        renderAppealSyncFollowup,
        renderFollowupBlockStrip,
        renderPendingDecisionStrip,
        renderRejectedBranchNotice,
    } = useEvictionFieldActionRenderers({
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
    });

    const branchShowsRejectedClosure = React.useCallback(
        (branch: string) => {
            const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
            const row = getGoverningEvictionProcedureRowForBranch(list, branch);
            if (!row?.id || branchFollowupBlocked(branch)) return false;
            if (isEvictionProcedureRowActive(row, list)) return false;
            if (!isExecutorRowRejectedAndFinal(row)) return false;
            return !isExecutorRequestAppealCycleSupersededFromRecord(row, list);
        },
        [branchFollowupBlocked, decisions]
    );

    const isBranchInProgress = React.useCallback(
        (branch: string) => {
            if (isBranchWorkflowComplete(branch)) return false;
            if (branchFollowupBlocked(branch) && !branchAppealCycleSuperseded(branch)) return true;
            if (isBranchNeedsCompletion(branch)) return true;
            if (branchShowsRejectedClosure(branch)) return true;
            return branchHasExistingHubRequest(branch);
        },
        [
            branchAppealCycleSuperseded,
            branchFollowupBlocked,
            branchHasExistingHubRequest,
            branchShowsRejectedClosure,
            isBranchNeedsCompletion,
            isBranchWorkflowComplete,
        ]
    );

    /** يُفعَّل الزر عند وجود طلب قائم أو بعد اكتمال دورة سابقة لإعادة الإرسال */
    const isBranchActionable = React.useCallback(
        (branch: string) => isBranchInProgress(branch) || isBranchWorkflowComplete(branch),
        [isBranchInProgress, isBranchWorkflowComplete]
    );

    const toggleBranchPanel = React.useCallback((branch: string) => {
        setInlineExpandedByBranch((prev) => ({ ...prev, [branch]: !prev[branch] }));
    }, []);

    const collapseBranchPanel = React.useCallback((branch: string) => {
        setInlineExpandedByBranch((prev) => {
            if (!prev[branch]) return prev;
            const next = { ...prev };
            delete next[branch];
            return next;
        });
        setInlineActionGateKey(null);
    }, []);

    const handleBranchPrimaryClick = React.useCallback(
        (branch: string, openNewRequestGate: () => void) => {
            if (isBranchInProgress(branch)) {
                toggleBranchPanel(branch);
                return;
            }
            if (locked && !isBranchWorkflowComplete(branch)) return;
            openNewRequestGate();
        },
        [isBranchInProgress, isBranchWorkflowComplete, locked, toggleBranchPanel]
    );

    const branchWasInProgressRef = React.useRef<Record<string, boolean>>({});

    React.useEffect(() => {
        setInlineExpandedByBranch((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const b of EVICTION_BRANCH_KEYS) {
                const inProgress = isBranchInProgress(b);
                const wasInProgress = Boolean(branchWasInProgressRef.current[b]);
                branchWasInProgressRef.current[b] = inProgress;
                if (inProgress && !wasInProgress && !next[b]) {
                    next[b] = true;
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [decisionRecords, EVICTION_BRANCH_KEYS, isBranchInProgress]);

    const submitEvictionRequest = React.useCallback(
        (input: {
            actionId: EvictionTimelineActionId;
            branch: string;
            timelineTitle: string;
            timelineDescription: string;
            requestTitle: string;
            supersedeCompletedHub?: boolean;
        }) => {
            if (locked) return;
            const execId = resolvePanelExecutionId();
            if (!execId) return;

            const sync = syncForBranch(input.branch);
            const submitGuard = assertEvictionBranchSubmitAllowed(sync);
            if (!submitGuard.ok) {
                toast(submitGuard.message, 'warning');
                return;
            }

            const resubmit =
                input.supersedeCompletedHub === true || isBranchWorkflowComplete(input.branch);
            if (!resubmit && branchHasExistingHubRequest(input.branch)) {
                setInlineActionGateKey(null);
                setInlineExpandedByBranch((prev) => ({ ...prev, [input.branch]: true }));
                toast('يوجد طلب قائم لهذا الإجراء — تابع الخطوات داخل البطاقة.', 'info');
                return;
            }

            const workflowKey =
                input.actionId === EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END
                    ? 'residential_grace_early_end'
                    : EVICTION_WORKFLOW_BY_ACTION_ID[input.actionId];

            const ok = appendEvictionExecutorRequest({
                executionId: execId,
                title: input.requestTitle,
                body: input.timelineDescription,
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: workflowKey,
                supersedeCompletedHub: resubmit,
                executionData,
            });

            if (!ok) {
                dispatchDecisionsReload();
                setInlineActionGateKey(null);
                setInlineExpandedByBranch((prev) => ({ ...prev, [input.branch]: true }));
                toast('يوجد طلب قائم لنفس الإجراء — تابع الخطوات داخل البطاقة.', 'warning');
                return;
            }

            fire(input.actionId, input.timelineTitle, input.timelineDescription);
            dispatchDecisionsReload();
            setInlineActionGateKey(null);
            setInlineExpandedByBranch((prev) => ({ ...prev, [input.branch]: true }));
            toast('تم إرسال الطلب إلى المنفذ.', 'success');
        },
        [
            executionData,
            fire,
            branchHasExistingHubRequest,
            isBranchWorkflowComplete,
            locked,
            resolvePanelExecutionId,
            syncForBranch,
            toast,
        ]
    );

    return {
        fire,
        click,
        EVICTION_BRANCH_KEYS,
        branchFollowupBlock,
        branchFollowupBlocked,
        branchAppealCycleSuperseded,
        resolvePanelExecutionId,
        handleWaiveCassationFromPanel,
        openAppeals,
        branchHasExistingHubRequest,
        isBranchWorkflowComplete,
        breakInventoryWorkflowComplete,
        isBranchNeedsCompletion,
        renderBranchExecutorActionsStrip,
        renderAppealSyncFollowup,
        renderFollowupBlockStrip,
        renderPendingDecisionStrip,
        renderRejectedBranchNotice,
        branchShowsRejectedClosure,
        isBranchInProgress,
        isBranchActionable,
        toggleBranchPanel,
        collapseBranchPanel,
        handleBranchPrimaryClick,
        submitEvictionRequest,
    };
}

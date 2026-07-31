/**
 * إجراءات التخلية الميدانية — وحدة معزولة عن التنفيذ المالي الحجزي.
 * التصميم: زجاج داكن + ذهبي متوافق مع الإضبارة.
 */

import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import {
    EVICTION_TIMELINE_ACTION_IDS,
    hasEvictionTimelineAction,
    type EvictionTimelineActionId,
} from '@/app/utils/executionModuleStrategies';
import {
    EVICTION_WORKFLOW_BY_ACTION_ID,
    fieldVisitAppointmentStorageKey,
    inferExecutorApprovalDecisionType,
    type EvictionExecutorWorkflowKey,
} from '@/app/utils/executorApprovalWorkflow';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    appendEvictionExecutorRequest,
    dispatchDecisionsReload,
    findApprovedFieldVisitNeedingSchedule,
    getExecutorDecisionRowById,
    getGoverningEvictionProcedureRowForBranch,
    getNewestEvictionProcedureRowForBranch,
    isEvictionBranchResendBlocked,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowPending,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import { isExecutorRequestAppealCycleSupersededFromRecord } from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    ExecutorRequestFollowupBlockPanel,
    WaiveInitialAppealButton,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/decisionCardPresentation';
import {
    resolveAllEvictionAppealSync,
    type EvictionAppealSyncBranch,
    type EvictionAppealSyncView,
} from '@/app/utils/evictionAppealSync';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import { ExecutionInlineAccordion, ExecutionInlineExecutorDecisionActions, type ExecutionInlineStep } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';
import { BreakInventoryFurnitureInlineForm } from '@/app/components/lawyer/execution/BreakInventoryFurnitureInlineForm';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import type { InlineActionGateKey } from '@/app/components/lawyer/ExecutionDashboard/types';

import type { EvictionFieldProceduresPanelProps } from './evictionFieldProceduresPanelProps';
import {
    EVICTION_ACTION_BRANCH,
    asEvictionDecisionRows,
    type EvictionDecisionRow,
} from './evictionFieldProceduresStyles';

export function useEvictionFieldProceduresPanel(props: EvictionFieldProceduresPanelProps) {
    const {
        locked,
        lockHint,
        timelineEvents,
        premisesUse,
        decisionsStorageExecutionId,
        showResidentialEvictionGraceButton,
        residentialGracePeriodSaved,
        onResidentialEvictionGraceClick,
        showResidentialGraceEarlyEndRequest,
        showBreakInventoryRequest,
        showEvictionFieldworkRequests,
        showDebtorHeirsEvictionTools,
        heirsNotificationDateYmd,
        onHeirsNotificationDateYmdChange,
        onIssueHeirsExecutionNoticeMemo,
        onRecordAction,
        tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails,
        openPoliceAssistanceDetails,
        savePoliceAssistance,
        saveBreakInventoryLedger,
        finalizeBreakInventoryRequest,
        isMaritalFurnitureClaim,
        maritalFurnitureItems,
        saveMaritalFurnitureDeliveryInventory,
    } = props;

    void premisesUse;
    const policeBtnRef = React.useRef<HTMLButtonElement | null>(null);
    const [scheduleDraftByDecisionId, setScheduleDraftByDecisionId] = React.useState<
        Record<string, { dateOnly: string; timeOptional: string; notes: string }>
    >({});
    const [scheduleSavingByDecisionId, setScheduleSavingByDecisionId] = React.useState<Record<string, boolean>>({});
    const [linkFieldVisitToAppointments, setLinkFieldVisitToAppointments] = React.useState(true);
    const [inlineExpandedByBranch, setInlineExpandedByBranch] = React.useState<Record<string, boolean>>({});
    const [inlineActionGateKey, setInlineActionGateKey] = React.useState<InlineActionGateKey | null>(null);
    const [confirmGate, setConfirmGate] = React.useState<
        null | 'early_end' | 'custodian'
    >(null);
    const [confirmBusy, setConfirmBusy] = React.useState(false);

    const hasBreak = useMemo(
        () => hasEvictionTimelineAction(timelineEvents, EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY),
        [timelineEvents]
    );

    const { executionId: decisionsExecId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);

    const toast = React.useCallback((message: string, type: 'success' | 'warning' | 'info' | 'error') => {
        try {
            window.dispatchEvent(new CustomEvent('hami-toast', { detail: { message, type } }));
        } catch {
            /* ignore */
        }
    }, []);

    const decisionList = useMemo(
        () => (Array.isArray(decisions) ? (decisions as unknown as Decision[]) : []),
        [decisions]
    );

    const decisionRows = useMemo(
        () => asEvictionDecisionRows(decisions),
        [decisions]
    );

    const appealSync = useMemo(
        () =>
            resolveAllEvictionAppealSync({
                executionId: decisionsExecId || decisionsStorageExecutionId,
                allDecisions: decisionRows,
            }),
        [decisionRows, decisionsExecId, decisionsStorageExecutionId]
    );

    const syncForBranch = React.useCallback(
        (branch: string): EvictionAppealSyncView =>
            appealSync[branch as EvictionAppealSyncBranch] ??
            appealSync['Field Visit Date'],
        [appealSync]
    );

    const fire = React.useCallback(
        (actionId: EvictionTimelineActionId, title: string, description: string) => {
            if (locked) return;
            const branch = EVICTION_ACTION_BRANCH[actionId];
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
            onRecordAction({ actionId, title, description });
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
        (branch: string) => isEvictionBranchResendBlocked(decisionRows, { branch }),
        [decisionRows]
    );

    const isBranchWorkflowComplete = React.useCallback(
        (branch: string) => Boolean(syncForBranch(branch).workflowComplete),
        [syncForBranch]
    );

    const isBranchNeedsCompletion = React.useCallback(
        (branch: string) => {
            const sync = syncForBranch(branch);
            if (sync.blocksFieldwork || sync.cycleSuperseded) return false;
            const row = sync.governingRow;
            if (!row) return false;
            return (
                sync.enforced &&
                !sync.workflowComplete &&
                isEvictionProcedureRowActive(row, decisionRows)
            );
        },
        [decisionRows, syncForBranch]
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
            const list = decisionRows;
            const row = getNewestEvictionProcedureRowForBranch(list, branch);
            if (!row?.id || !isEvictionProcedureRowPending(row) || !isEvictionProcedureRowActive(row, list)) {
                return null;
            }
            const decisionId = String(row.id || '').trim();
            if (!decisionId) return null;
            const execId = resolvePanelExecutionId();
            if (!execId) return null;
            const rejected = isExecutorRowRejectedAndFinal(row);

            return (
                <div className="border-t border-white/10 px-3 py-3">
                    <div className="space-y-2 rounded-2xl border border-amber-500/25 bg-amber-950/20 p-3">
                        <p className="text-[11px] font-black text-right text-amber-100">قرار المنفذ — قيد البت</p>
                        <ExecutionInlineExecutorDecisionActions
                            executionId={execId}
                            decisionId={decisionId}
                            requestKind="eviction_procedure"
                            disabled={rejected}
                            onOpenAppealCenter={rejected ? () => openAppeals(decisionId) : undefined}
                        />
                    </div>
                </div>
            );
        },
        [decisionRows, openAppeals, resolvePanelExecutionId]
    );

    const renderRejectedBranchNotice = React.useCallback(
        (branch: string, _onResubmit: () => void) => {
            const list = decisionRows;
            const row = getNewestEvictionProcedureRowForBranch(list, branch);
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
        [branchFollowupBlocked, decisionList, decisionRows, locked, openAppeals, resolvePanelExecutionId, toast]
    );

    const branchShowsRejectedClosure = React.useCallback(
        (branch: string) => {
            const list = decisionRows;
            const row = getNewestEvictionProcedureRowForBranch(list, branch);
            if (!row?.id || branchFollowupBlocked(branch)) return false;
            if (isEvictionProcedureRowActive(row, list)) return false;
            if (!isExecutorRowRejectedAndFinal(row)) return false;
            return !isExecutorRequestAppealCycleSupersededFromRecord(row, list);
        },
        [branchFollowupBlocked, decisionRows]
    );

    const isBranchInProgress = React.useCallback(
        (branch: string) => {
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

    React.useEffect(() => {
        setInlineExpandedByBranch((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const b of EVICTION_BRANCH_KEYS) {
                if (isBranchInProgress(b)) {
                    if (!next[b]) {
                        next[b] = true;
                        changed = true;
                    }
                } else if (next[b]) {
                    delete next[b];
                    changed = true;
                }
            }
            return changed ? next : prev;
        });
    }, [decisions, isBranchInProgress, EVICTION_BRANCH_KEYS]);

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
            const execId = String(decisionsStorageExecutionId || '').trim();
            if (!execId || execId === 'undefined') return;

            const sync = syncForBranch(input.branch);
            if (sync.blocksSubmit) {
                toast(
                    sync.followupBlock?.message ??
                        'لا يمكن إرسال طلب جديد — الطلب موقوف بسبب التظلم أو الطعن.',
                    'warning'
                );
                return;
            }
            if (sync.blocked && sync.followupBlock?.kind !== 'lifecycle_reset') {
                toast(
                    sync.followupBlock?.message ??
                        'الإجراء موقوف — أكمل مسار الطعن من مركز القرارات.',
                    'warning'
                );
                return;
            }

            const resubmit =
                input.supersedeCompletedHub === true || isBranchWorkflowComplete(input.branch);
            if (!resubmit && branchHasExistingHubRequest(input.branch)) {
                toast('يوجد طلب سابق لنفس الإجراء — لا يمكن إرسال طلب مماثل.', 'warning');
                return;
            }

            fire(input.actionId, input.timelineTitle, input.timelineDescription);

            const workflowKey: EvictionExecutorWorkflowKey =
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
            });

            if (ok) {
                dispatchDecisionsReload();
                setInlineActionGateKey(null);
                setInlineExpandedByBranch((prev) => ({ ...prev, [input.branch]: true }));
            }
            toast(
                ok ? 'تم إرسال الطلب إلى المنفذ.' : 'يوجد طلب قائم لنفس الإجراء.',
                ok ? 'success' : 'warning'
            );
        },
        [
            decisionsStorageExecutionId,
            fire,
            branchHasExistingHubRequest,
            isBranchWorkflowComplete,
            locked,
            setInlineExpandedByBranch,
            syncForBranch,
            toast,
        ]
    );

    const buildArabicDateLabel = (dateOnly: string) => {
        try {
            return new Date(dateOnly).toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return dateOnly;
        }
    };

    const renderRowFollowupBlock = React.useCallback(
        (row: EvictionDecisionRow) => {
            const branch = inferExecutorApprovalDecisionType({
                title: String(row.title || ''),
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: row.evictionWorkflowKey,
            });
            if (!branch || !EVICTION_BRANCH_KEYS.includes(branch as (typeof EVICTION_BRANCH_KEYS)[number])) {
                return null;
            }
            const sync = syncForBranch(branch);
            if (!sync.followupBlock || sync.decisionId !== String(row.id || '').trim()) {
                return null;
            }
            const panel = renderAppealSyncFollowup(sync);
            if (!panel) return null;
            return <div className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3">{panel}</div>;
        },
        [EVICTION_BRANCH_KEYS, renderAppealSyncFollowup, syncForBranch]
    );

    const renderFieldVisitInline = (row: EvictionDecisionRow) => {
        if (!row?.id) return null;
        const rowBlock = renderRowFollowupBlock(row);
        if (rowBlock) return rowBlock;
        const decisionId = String(row.id || '').trim();
        const list = decisionRows;
        const rejected = isExecutorRowRejectedAndFinal(row);
        const approved = isExecutorRowApprovedWorkflowActive(row, list);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '';
        const scheduleLabel = String(row.executorScheduleLabel || '').trim();
        const scheduleReady = approved && !rejected && scheduleLabel === '';

        if (pending || rejected) return null;
        if (!approved) return null;
        if (scheduleLabel) {
            return (
                <div className="border-t border-white/10 px-3 pb-3 pt-2">
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-3 text-right">
                        <p className="text-[11px] font-black text-emerald-100">تم تحديد الموعد</p>
                        <p className="mt-1 text-[10px] leading-relaxed text-emerald-200/90">{scheduleLabel}</p>
                    </div>
                </div>
            );
        }

        const draft = scheduleDraftByDecisionId[decisionId] || { dateOnly: '', timeOptional: '', notes: '' };
        const saving = Boolean(scheduleSavingByDecisionId[decisionId]);

        const canSave = scheduleReady && Boolean(String(draft.dateOnly || '').trim()) && !saving;

        const steps: ExecutionInlineStep[] = [
            {
                id: `${decisionId}:sent`,
                title: 'طلب تحديد موعد الخروج الميداني',
                subtitle: 'تم إرسال الطلب',
                status: 'done',
                tone: 'success',
            },
            {
                id: `${decisionId}:executor`,
                title: 'قرار المنفذ',
                subtitle: 'تمت الموافقة',
                status: 'done',
                tone: 'success',
            },
            {
                id: `${decisionId}:schedule`,
                title: 'تسجيل موعد الخروج الميداني',
                subtitle: scheduleLabel ? scheduleLabel : scheduleReady ? 'أدخل تاريخ الموعد ثم احفظ' : 'مقفلة حتى موافقة المنفذ',
                status: scheduleLabel ? 'done' : scheduleReady ? 'active' : rejected ? 'locked' : 'locked',
                tone: scheduleLabel ? 'success' : rejected ? 'danger' : 'neutral',
                content: scheduleReady ? (
                    <div className="space-y-2">
                        <input
                            type="date"
                            value={draft.dateOnly}
                            onChange={(e) =>
                                setScheduleDraftByDecisionId((prev) => ({
                                    ...prev,
                                    [decisionId]: { ...draft, dateOnly: e.target.value },
                                }))
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"
                            style={{ direction: 'ltr', textAlign: 'right' }}
                        />
                        <textarea
                            rows={3}
                            value={draft.notes}
                            onChange={(e) =>
                                setScheduleDraftByDecisionId((prev) => ({
                                    ...prev,
                                    [decisionId]: { ...draft, notes: e.target.value },
                                }))
                            }
                            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100 text-right"
                            placeholder="ملاحظات (اختياري)"
                        />
                        <FollowupSectionLinkCheckbox
                            checked={linkFieldVisitToAppointments}
                            onChange={setLinkFieldVisitToAppointments}
                            label="إضافة الموعد إلى قسم المواعيد"
                            hint="يمكنك إلغاء التحديد إذا أردت الحفظ في السجل فقط."
                        />
                        <button
                            type="button"
                            disabled={!canSave}
                            onClick={() => {
                                if (!canSave) return;
                                if (appealSync['Field Visit Date'].blocksFieldwork) {
                                    toast(
                                        appealSync['Field Visit Date'].followupBlock?.message ??
                                            'لا يمكن تسجيل الموعد — الطلب موقوف بسبب التظلم أو الطعن.',
                                        'warning'
                                    );
                                    return;
                                }
                                const dateOnly = String(draft.dateOnly || '').trim();
                                const eventIso = `${dateOnly}T12:00:00`;
                                const eventDateLabel = buildArabicDateLabel(dateOnly);
                                const displayAr = eventDateLabel;

                                setScheduleSavingByDecisionId((prev) => ({ ...prev, [decisionId]: true }));
                                try {
                                    patchExecutorDecisionRow(decisionsExecId, decisionId, {
                                        executorScheduleLabel: `مجدول: ${displayAr}`,
                                        executorNote: String(draft.notes || '').trim()
                                            ? `ملاحظات الموعد: ${String(draft.notes || '').trim()}`
                                            : undefined,
                                    });
                                    try {
                                        if (decisionsExecId) {
                                            SecureStoreService.setItemSync(fieldVisitAppointmentStorageKey(decisionsExecId), eventIso);
                                        }
                                    } catch {
                                        /* ignore */
                                    }
                                } finally {
                                    setScheduleSavingByDecisionId((prev) => ({ ...prev, [decisionId]: false }));
                                    queueMicrotask(() => {
                                        dispatchDecisionsReload();
                                        const updated = getExecutorDecisionRowById(decisionsExecId, decisionId) as EvictionDecisionRow | null;
                                        const ok = String(updated?.executorScheduleLabel || '').trim() !== '';
                                        if (!ok) return;
                                        collapseBranchPanel('Field Visit Date');
                                        try {
                                            window.dispatchEvent(
                                                new CustomEvent('hami-eviction-field-visit-scheduled', {
                                                    detail: {
                                                        executionId: decisionsExecId,
                                                        decisionId,
                                                        eventIso,
                                                        purpose: 'موعد الخروج الميداني',
                                                        displayAr,
                                                        linkToAppointments: linkFieldVisitToAppointments,
                                                    },
                                                })
                                            );
                                        } catch {
                                            /* ignore */
                                        }
                                        policeBtnRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    });
                                }
                            }}
                            className="w-full rounded-xl bg-gradient-to-l from-amber-500 to-yellow-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                        >
                            {saving ? 'جارٍ الحفظ...' : 'تأكيد وحفظ الموعد'}
                        </button>
                    </div>
                ) : null,
            } satisfies ExecutionInlineStep,
        ];

        return (
            <div className="border-t border-white/10 px-3 pb-3 pt-2">
                <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                    <ExecutionInlineAccordion steps={steps} />
                </div>
            </div>
        );
    };

    const findActiveApprovedIncompleteRow = React.useCallback(
        (branch: string): EvictionDecisionRow | null => {
            const list = decisionRows;
            const newest = getGoverningEvictionProcedureRowForBranch(list, branch);
            if (!newest) return null;
            if (
                isExecutorRowApprovedWorkflowActive(newest as Record<string, unknown>, list as Record<string, unknown>[]) &&
                !isExecutorRowRejectedAndFinal(newest) &&
                isEvictionProcedureRowActive(newest, list)
            ) {
                return newest;
            }
            return null;
        },
        [decisionRows]
    );

    const resolveFieldVisitScheduleRow = React.useCallback((): EvictionDecisionRow | null => {
        const fromActive = findActiveApprovedIncompleteRow('Field Visit Date');
        if (fromActive?.id) return fromActive;
        const execId = resolvePanelExecutionId();
        if (!execId) return null;
        const hint = findApprovedFieldVisitNeedingSchedule(execId);
        if (!hint?.decisionId) return null;
        return getExecutorDecisionRowById(execId, hint.decisionId) as EvictionDecisionRow | null;
    }, [findActiveApprovedIncompleteRow, resolvePanelExecutionId]);

    const renderInlineDecision = (branch: string, label: string, afterApprove?: React.ReactNode) => {
        if (!inlineExpandedByBranch[branch]) return null;
        const row =
            branch === 'Field Visit Date'
                ? resolveFieldVisitScheduleRow()
                : findActiveApprovedIncompleteRow(branch);
        if (!row?.id) return null;
        const rowBlock = renderRowFollowupBlock(row);
        if (rowBlock) {
            return <div className="border-t border-white/10 px-3 pb-3 pt-2">{rowBlock}</div>;
        }
        if (!isBranchNeedsCompletion(branch) && branch !== 'Field Visit Date') return null;
        if (branch === 'Field Visit Date') {
            return renderFieldVisitInline(row);
        }
        const decisionId = String(row.id || '').trim();
        const list = decisionRows;
        const approved = isExecutorRowApprovedWorkflowActive(row, list);
        if (!approved) return null;
        let effectiveAfterApprove: React.ReactNode = afterApprove ?? null;
        if (!effectiveAfterApprove && branch === 'Police Assistance Request') {
            const savedAt = String(row.policeAssistanceSavedAt || '').trim();
            if (!savedAt) {
                const requestTitle =
                    String(row.title || 'مفاتحة الشرطة للقوة الإجرائية').trim() ||
                    'مفاتحة الشرطة للقوة الإجرائية';
                effectiveAfterApprove = savePoliceAssistance ? (
                    <PoliceAssistanceInlineForm
                        requestTitle={requestTitle}
                        initialAgencyName={String(row.policeAssistanceAgency || '')}
                        disabled={locked}
                        onSave={({ agencyName, linkToTasks }) => {
                            if (locked) return;
                            if (appealSync['Police Assistance Request'].blocksFieldwork) {
                                toast(
                                    appealSync['Police Assistance Request'].followupBlock?.message ??
                                        'لا يمكن تسجيل القوة الجبرية — الطلب موقوف بسبب التظلم أو الطعن.',
                                    'warning'
                                );
                                return;
                            }
                            savePoliceAssistance({ decisionId, agencyName, linkToTasks });
                            queueMicrotask(() => collapseBranchPanel('Police Assistance Request'));
                        }}
                    />
                ) : (
                    <button
                        type="button"
                        disabled={locked}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            if (appealSync['Police Assistance Request'].blocksFieldwork) {
                                toast(
                                    appealSync['Police Assistance Request'].followupBlock?.message ??
                                        'لا يمكن تسجيل القوة الجبرية — الطلب موقوف بسبب التظلم أو الطعن.',
                                    'warning'
                                );
                                return;
                            }
                            const fallbackTitle =
                                String(row.title || 'القوة الجبرية').trim() || 'القوة الجبرية';
                            if (openPoliceAssistanceDetails) {
                                openPoliceAssistanceDetails({ decisionId, requestTitle: fallbackTitle });
                                return;
                            }
                            if (!decisionsExecId) return;
                            try {
                                window.dispatchEvent(
                                    new CustomEvent('hami-open-decisions-modal', {
                                        detail: { executionId: decisionsExecId, tab: 'previous', decisionId },
                                    })
                                );
                            } catch {
                                /* ignore */
                            }
                        }}
                        className="w-full rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-extrabold text-amber-200 hover:bg-amber-500/15 disabled:opacity-40"
                    >
                        تسجيل القوة الجبرية
                    </button>
                );
            }
        }
        if (!effectiveAfterApprove && branch === 'Lock Breaking & Inventory') {
            const finalizedAt = String(row.breakInventoryFurnitureFinalizedAt || '').trim();
            if (!finalizedAt && finalizeBreakInventoryRequest) {
                if (isMaritalFurnitureClaim && saveMaritalFurnitureDeliveryInventory) {
                    effectiveAfterApprove = (
                        <MaritalFurnitureDeliveryInventoryForm
                            items={maritalFurnitureItems}
                            disabled={locked}
                            ledgerSaved={Boolean(
                                String(row.breakInventoryFurnitureLedgerAt || '').trim()
                            )}
                            onSave={(items) => {
                                if (locked) return;
                                saveMaritalFurnitureDeliveryInventory({ decisionId, items });
                            }}
                            onFinalize={() => {
                                if (locked) return;
                                finalizeBreakInventoryRequest({ decisionId });
                                queueMicrotask(() =>
                                    collapseBranchPanel('Lock Breaking & Inventory')
                                );
                            }}
                        />
                    );
                } else if (saveBreakInventoryLedger) {
                    effectiveAfterApprove = (
                        <BreakInventoryFurnitureInlineForm
                            embedded
                            requestTitle="طلب كسر الأقفال وجرد الأثاث"
                            disabled={locked}
                            ledgerSaved={Boolean(
                                String(row.breakInventoryFurnitureLedgerAt || '').trim()
                            )}
                            onSave={(payload) => {
                                if (locked) return;
                                saveBreakInventoryLedger({ decisionId, payload });
                            }}
                            onFinalize={() => {
                                if (locked) return;
                                finalizeBreakInventoryRequest({ decisionId });
                                queueMicrotask(() =>
                                    collapseBranchPanel('Lock Breaking & Inventory')
                                );
                            }}
                        />
                    );
                }
            }
        }
        if (!effectiveAfterApprove) return null;

        const steps: ExecutionInlineStep[] = [
            {
                id: `${decisionId}:sent`,
                title: label,
                subtitle: 'تم إرسال الطلب',
                status: 'done',
                tone: 'success',
            },
            {
                id: `${decisionId}:executor`,
                title: 'قرار المنفذ',
                subtitle: 'تمت الموافقة',
                status: 'done',
                tone: 'success',
            },
            ...(effectiveAfterApprove
                ? [
                      {
                          id: `${decisionId}:after`,
                          title: 'إكمال البيانات',
                          subtitle: 'بعد الموافقة — وسّع لإدخال البيانات',
                          status: 'active',
                          tone: 'neutral',
                          content: effectiveAfterApprove,
                      } satisfies ExecutionInlineStep,
                  ]
                : []),
        ];

        return (
            <div className="border-t border-white/10 px-3 pb-3 pt-2">
                <ExecutionInlineAccordion steps={steps} />
            </div>
        );
    };

    const renderEvictionBranchPanelBody = (
        branch: string,
        label: string,
        afterApprove?: React.ReactNode,
        onRejectedResubmit?: () => void
    ) => {
        if (!inlineExpandedByBranch[branch] || !isBranchInProgress(branch)) return null;
        const followupStrip = branchFollowupBlocked(branch) ? renderFollowupBlockStrip(branch) : null;
        const pendingStrip = renderPendingDecisionStrip(branch);
        const rejectedNotice =
            onRejectedResubmit && !pendingStrip
                ? renderRejectedBranchNotice(branch, onRejectedResubmit)
                : null;
        const inlinePanel =
            branchFollowupBlocked(branch) && followupStrip
                ? null
                : renderInlineDecision(branch, label, afterApprove);
        const body = followupStrip || pendingStrip || inlinePanel || rejectedNotice;
        if (body) return <>{body}</>;
        return (
            <div className="border-t border-white/10 px-3 py-3 text-[10px] leading-relaxed text-slate-400 text-right">
                لا تتوفر خطوة تالية هنا — افتح «القرارات والطعون» لمتابعة الطلب.
            </div>
        );
    };

    const renderBranchChevron = (branch: string) => {
        if (!isBranchInProgress(branch)) return null;
        const open = Boolean(inlineExpandedByBranch[branch]);
        return (
            <ChevronDown
                size={18}
                strokeWidth={2}
                className={`shrink-0 text-[#D4AF37]/55 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            />
        );
    };


    return {
        policeBtnRef, scheduleDraftByDecisionId, setScheduleDraftByDecisionId, scheduleSavingByDecisionId, setScheduleSavingByDecisionId, linkFieldVisitToAppointments,
        setLinkFieldVisitToAppointments, inlineExpandedByBranch, setInlineExpandedByBranch, inlineActionGateKey, setInlineActionGateKey, confirmGate,
        setConfirmGate, confirmBusy, setConfirmBusy, hasBreak, toast, decisionList,
        decisionRows, appealSync, syncForBranch, fire, EVICTION_BRANCH_KEYS, branchFollowupBlocked,
        branchAppealCycleSuperseded, resolvePanelExecutionId, handleWaiveCassationFromPanel, openAppeals, branchHasExistingHubRequest, isBranchWorkflowComplete,
        isBranchNeedsCompletion, renderAppealSyncFollowup, renderFollowupBlockStrip, renderPendingDecisionStrip, renderRejectedBranchNotice, branchShowsRejectedClosure,
        isBranchInProgress, isBranchActionable, toggleBranchPanel, collapseBranchPanel, handleBranchPrimaryClick, submitEvictionRequest,
        buildArabicDateLabel, renderRowFollowupBlock, renderFieldVisitInline, findActiveApprovedIncompleteRow, resolveFieldVisitScheduleRow, renderInlineDecision,
        renderEvictionBranchPanelBody, renderBranchChevron, locked, lockHint, timelineEvents, decisionsStorageExecutionId,
        showResidentialEvictionGraceButton, residentialGracePeriodSaved, onResidentialEvictionGraceClick, showResidentialGraceEarlyEndRequest, showBreakInventoryRequest, showEvictionFieldworkRequests,
        showDebtorHeirsEvictionTools, heirsNotificationDateYmd, onHeirsNotificationDateYmdChange, onIssueHeirsExecutionNoticeMemo, onRecordAction, tryOpenPendingBreakInventoryLedger,
        tryOpenPendingCustodianDetails, openPoliceAssistanceDetails, savePoliceAssistance, saveBreakInventoryLedger, finalizeBreakInventoryRequest, isMaritalFurnitureClaim,
        maritalFurnitureItems, saveMaritalFurnitureDeliveryInventory,
    };
}

export type EvictionFieldProceduresPanelViewModel = ReturnType<typeof useEvictionFieldProceduresPanel>;

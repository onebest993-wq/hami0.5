// @ts-nocheck
/**
 * إجراءات التخلية الميدانية — وحدة معزولة عن التنفيذ المالي الحجزي.
 * التصميم: زجاج داكن + ذهبي متوافق مع الإضبارة.
 */

import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Calendar, Shield, Hammer, UserCheck, Timer, ChevronDown } from 'lucide-react';
import {
    EVICTION_TIMELINE_ACTION_IDS,
    hasEvictionTimelineAction,
    type EvictionTimelineActionId,
} from '@/app/utils/executionModuleStrategies';
import type { TimelineEvent } from '@/app/types/execution';
import type { EvictionPremisesUse } from '@/app/utils/executionModuleStrategies';
import {
    EVICTION_WORKFLOW_BY_ACTION_ID,
    fieldVisitAppointmentStorageKey,
    inferExecutorApprovalDecisionType,
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
import { InlineActionGate } from '@/app/components/lawyer/ExecutionDashboard/components/InlineActionGate';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import { PoliceAssistanceInlineForm } from '@/app/components/lawyer/execution/PoliceAssistanceInlineForm';
import { BreakInventoryFurnitureInlineForm } from '@/app/components/lawyer/execution/BreakInventoryFurnitureInlineForm';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { BreakInventoryFurnitureSavePayload } from '@/app/utils/executorApprovalWorkflow';
import type { InlineActionGateKey } from '@/app/components/lawyer/ExecutionDashboard/types';

export interface EvictionFieldProceduresPanelProps {
    locked: boolean;
    lockHint?: string;
    timelineEvents: TimelineEvent[];
    premisesUse: EvictionPremisesUse;
    decisionsStorageExecutionId: string;
    /** عقار سكني / منزل (استعمال سكني) — زر مهلة التخلية بجانب الخروج الميداني */
    showResidentialEvictionGraceButton?: boolean;
    /** مهلة سكنية محفوظة — يُعرض زر التعديل بدل فتح نموذج الإنشاء */
    residentialGracePeriodSaved?: boolean;
    onResidentialEvictionGraceClick?: (opts?: { edit?: boolean }) => void;
    /** مهلة سكنية سارية (بداية + نهاية ولم تنتهِ بعد) */
    showResidentialGraceEarlyEndRequest?: boolean;
    /** كسر الأقفال — يظهر فقط بلا مهلة سكنية أو بعد إنهائها/الموافقة على إنهاء المهلة */
    showBreakInventoryRequest?: boolean;
    /** الخروج الميداني والقوة الجبرية — نفس شرط المهلة السكنية */
    showEvictionFieldworkRequests?: boolean;
    /** تخلية + مدين متوفى: أدوات إخبار الورثة */
    showDebtorHeirsEvictionTools?: boolean;
    heirsNotificationDateYmd?: string;
    onHeirsNotificationDateYmdChange?: (ymd: string) => void;
    onIssueHeirsExecutionNoticeMemo?: () => void;
    onRecordAction: (input: {
        actionId: EvictionTimelineActionId;
        title: string;
        description: string;
    }) => void;
    /** موافقة على الجرد دون حفظ القائمة في الملاحظات */
    tryOpenPendingBreakInventoryLedger?: () => boolean;
    /** موافقة على الحارس دون حفظ الاسم والراتب */
    tryOpenPendingCustodianDetails?: () => boolean;
    openPoliceAssistanceDetails?: (input: { decisionId: string; requestTitle: string }) => void;
    savePoliceAssistance?: (input: {
        decisionId: string;
        agencyName: string;
        linkToTasks: boolean;
    }) => void;
    saveBreakInventoryLedger?: (input: {
        decisionId: string;
        payload: BreakInventoryFurnitureSavePayload;
    }) => void;
    finalizeBreakInventoryRequest?: (input: { decisionId: string }) => void;
    isMaritalFurnitureClaim?: boolean;
    maritalFurnitureItems?: MaritalFurnitureItem[];
    saveMaritalFurnitureDeliveryInventory?: (input: {
        decisionId: string;
        items: MaritalFurnitureItem[];
    }) => void;
}

const BTN_BASE =
    'h-16 w-full flex flex-row-reverse items-center justify-between gap-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-white/20 hover:shadow-[0_0_30px_rgba(255,255,255,0.05)] transition-all duration-300 group cursor-pointer overflow-hidden text-right px-4';
const BTN_DISABLED = 'opacity-45 cursor-not-allowed hover:border-white/5';

const TONE_GRACE = 'bg-sky-500/[0.06] hover:bg-sky-500/[0.10] border-sky-300/15 hover:border-sky-200/25';
const TONE_FIELD_VISIT = 'bg-amber-500/[0.06] hover:bg-amber-500/[0.10] border-amber-300/15 hover:border-amber-200/25';
const TONE_POLICE = 'bg-rose-500/[0.06] hover:bg-rose-500/[0.10] border-rose-300/15 hover:border-rose-200/25';
const TONE_EARLY_END = 'bg-violet-500/[0.06] hover:bg-violet-500/[0.10] border-violet-300/15 hover:border-violet-200/25';
const TONE_BREAK = 'bg-orange-500/[0.06] hover:bg-orange-500/[0.10] border-orange-300/15 hover:border-orange-200/25';
const TONE_CUSTODIAN = 'bg-emerald-500/[0.06] hover:bg-emerald-500/[0.10] border-emerald-300/15 hover:border-emerald-200/25';

const EVICTION_ACTION_BRANCH: Partial<Record<EvictionTimelineActionId, EvictionAppealSyncBranch>> = {
    [EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT]: 'Field Visit Date',
    [EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE]: 'Police Assistance Request',
    [EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY]: 'Lock Breaking & Inventory',
    [EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN]: 'Judicial Custodian',
    [EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END]: 'Residential Grace Early End',
};

export const EvictionFieldProceduresPanel = React.memo(function EvictionFieldProceduresPanel({
    locked,
    lockHint,
    timelineEvents,
    premisesUse,
    decisionsStorageExecutionId,
    showResidentialEvictionGraceButton,
    residentialGracePeriodSaved = false,
    onResidentialEvictionGraceClick,
    showResidentialGraceEarlyEndRequest,
    showBreakInventoryRequest = true,
    showEvictionFieldworkRequests = true,
    showDebtorHeirsEvictionTools,
    heirsNotificationDateYmd = '',
    onHeirsNotificationDateYmdChange,
    onIssueHeirsExecutionNoticeMemo,
    onRecordAction,
    tryOpenPendingBreakInventoryLedger,
    tryOpenPendingCustodianDetails,
    openPoliceAssistanceDetails,
    savePoliceAssistance,
    saveBreakInventoryLedger,
    finalizeBreakInventoryRequest,
    isMaritalFurnitureClaim = false,
    maritalFurnitureItems = [],
    saveMaritalFurnitureDeliveryInventory,
}: EvictionFieldProceduresPanelProps) {
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
        () => (Array.isArray(decisions) ? (decisions as Decision[]) : []),
        [decisions]
    );

    const decisionRecords = useMemo(
        () => (Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : []),
        [decisions]
    );

    const appealSync = useMemo(
        () =>
            resolveAllEvictionAppealSync({
                executionId: decisionsExecId || decisionsStorageExecutionId,
                allDecisions: decisionRecords,
            }),
        [decisionRecords, decisions, decisionsExecId, decisionsStorageExecutionId]
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

    const isBranchNeedsCompletion = React.useCallback(
        (branch: string) => {
            const sync = syncForBranch(branch);
            if (sync.blocksFieldwork || sync.cycleSuperseded) return false;
            const row = sync.governingRow;
            if (!row) return false;
            return (
                sync.enforced &&
                !sync.workflowComplete &&
                isEvictionProcedureRowActive(row, decisionRecords)
            );
        },
        [decisionRecords, syncForBranch]
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
        [decisions, openAppeals, resolvePanelExecutionId]
    );

    const renderRejectedBranchNotice = React.useCallback(
        (branch: string, _onResubmit: () => void) => {
            const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
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
        [branchFollowupBlocked, decisionList, decisions, locked, openAppeals, resolvePanelExecutionId, toast]
    );

    const branchShowsRejectedClosure = React.useCallback(
        (branch: string) => {
            const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
            const row = getNewestEvictionProcedureRowForBranch(list, branch);
            if (!row?.id || branchFollowupBlocked(branch)) return false;
            if (isEvictionProcedureRowActive(row, list)) return false;
            if (!isExecutorRowRejectedAndFinal(row)) return false;
            return !isExecutorRequestAppealCycleSupersededFromRecord(row, list);
        },
        [branchFollowupBlocked, decisions]
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

            const workflowKey =
                input.actionId === (EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END as any)
                    ? 'residential_grace_early_end'
                    : (EVICTION_WORKFLOW_BY_ACTION_ID[input.actionId] as any);

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

    const buildArabicTimeLabel = (eventIso: string) => {
        try {
            return new Date(eventIso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return null;
        }
    };

    const renderRowFollowupBlock = React.useCallback(
        (row: Record<string, unknown>) => {
            const branch = inferExecutorApprovalDecisionType({
                title: String((row as { title?: string }).title || ''),
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: (row as { evictionWorkflowKey?: string }).evictionWorkflowKey,
            });
            if (!branch || !EVICTION_BRANCH_KEYS.includes(branch as (typeof EVICTION_BRANCH_KEYS)[number])) {
                return null;
            }
            const sync = syncForBranch(branch);
            if (!sync.followupBlock || sync.decisionId !== String((row as { id?: string }).id || '').trim()) {
                return null;
            }
            const panel = renderAppealSyncFollowup(sync);
            if (!panel) return null;
            return <div className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3">{panel}</div>;
        },
        [EVICTION_BRANCH_KEYS, renderAppealSyncFollowup, syncForBranch]
    );

    const renderFieldVisitInline = (row: any) => {
        if (!row?.id) return null;
        const rowBlock = renderRowFollowupBlock(row);
        if (rowBlock) return rowBlock;
        const decisionId = String(row.id || '').trim();
        const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
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
                                    } as any);
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
                                        const updated = getExecutorDecisionRowById(decisionsExecId, decisionId) as any;
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
        (branch: string) => {
            const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
            const newest = getGoverningEvictionProcedureRowForBranch(list, branch);
            if (!newest) return null;
            if (
                isExecutorRowApprovedWorkflowActive(newest, list) &&
                !isExecutorRowRejectedAndFinal(newest) &&
                isEvictionProcedureRowActive(newest, list)
            ) {
                return newest;
            }
            return null;
        },
        [decisions]
    );

    const resolveFieldVisitScheduleRow = React.useCallback(() => {
        const fromActive = findActiveApprovedIncompleteRow('Field Visit Date');
        if (fromActive?.id) return fromActive;
        const execId = resolvePanelExecutionId();
        if (!execId) return null;
        const hint = findApprovedFieldVisitNeedingSchedule(execId);
        if (!hint?.decisionId) return null;
        return getExecutorDecisionRowById(execId, hint.decisionId);
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
        const list = Array.isArray(decisions) ? (decisions as Record<string, unknown>[]) : [];
        const approved = isExecutorRowApprovedWorkflowActive(row, list);
        if (!approved) return null;
        let effectiveAfterApprove: React.ReactNode = afterApprove ?? null;
        if (!effectiveAfterApprove && branch === 'Police Assistance Request') {
            const savedAt = String((row as any).policeAssistanceSavedAt || '').trim();
            if (!savedAt) {
                const requestTitle =
                    String((row as any).title || 'مفاتحة الشرطة للقوة الإجرائية').trim() ||
                    'مفاتحة الشرطة للقوة الإجرائية';
                effectiveAfterApprove = savePoliceAssistance ? (
                    <PoliceAssistanceInlineForm
                        requestTitle={requestTitle}
                        initialAgencyName={String((row as any).policeAssistanceAgency || '')}
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
                                String((row as any).title || 'القوة الجبرية').trim() || 'القوة الجبرية';
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
            const finalizedAt = String((row as any).breakInventoryFurnitureFinalizedAt || '').trim();
            if (!finalizedAt && finalizeBreakInventoryRequest) {
                if (isMaritalFurnitureClaim && saveMaritalFurnitureDeliveryInventory) {
                    effectiveAfterApprove = (
                        <MaritalFurnitureDeliveryInventoryForm
                            items={maritalFurnitureItems}
                            disabled={locked}
                            ledgerSaved={Boolean(
                                String((row as any).breakInventoryFurnitureLedgerAt || '').trim()
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
                                String((row as any).breakInventoryFurnitureLedgerAt || '').trim()
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

    return (
        <div className="space-y-3">
            {locked && lockHint && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/25 backdrop-blur-xl px-3 py-2 text-amber-200 text-xs text-right">
                    {lockHint}
                </div>
            )}

            {showDebtorHeirsEvictionTools && onIssueHeirsExecutionNoticeMemo && (
                <div className="rounded-2xl border border-white/10 bg-[#0A1122]/60 backdrop-blur-xl px-3 py-2.5 space-y-2 text-right">
                    <p className="text-[9px] text-slate-500">تبليغ الورثة — اختياري</p>
                    {onHeirsNotificationDateYmdChange && (
                        <label className="flex flex-col gap-1 items-stretch">
                            <span className="text-[10px] text-slate-400">تاريخ تبليغ الورثة</span>
                            <input
                                type="date"
                                value={heirsNotificationDateYmd}
                                onChange={(e) => onHeirsNotificationDateYmdChange(e.target.value)}
								className="w-full bg-black/20 border border-white/10 text-white rounded-2xl p-4 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 focus:bg-black/40 transition-all placeholder:text-white/20"
                            />
                        </label>
                    )}
                    <button
                        type="button"
                        disabled={locked}
                        className={`${BTN_BASE} ${locked ? BTN_DISABLED : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            onIssueHeirsExecutionNoticeMemo();
                        }}
                    >
                        <div className="flex flex-row-reverse items-center gap-3">
                            <span className="text-lg shrink-0 opacity-80" aria-hidden>
                                📜
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-white font-bold text-sm">
                                    إصدار مذكرة إخبار بالتنفيذ للورثة
                                </p>
                            </div>
                        </div>
                    </button>
                </div>
            )}

			<motion.div
				className="flex flex-col gap-4"
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 1 },
                    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
                }}
			>
                {showResidentialEvictionGraceButton && onResidentialEvictionGraceClick ? (
                    <motion.button
                        type="button"
                        disabled={locked}
                        title={
                            residentialGracePeriodSaved
                                ? 'تعديل مهلة التخلية — المدة وتاريخ الانتهاء'
                                : 'مهلة — المدة وتاريخ الانتهاء'
                        }
                        aria-label={residentialGracePeriodSaved ? 'تعديل المهلة' : 'مهلة'}
                        className={`${BTN_BASE} ${TONE_GRACE} ${locked ? BTN_DISABLED : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            onResidentialEvictionGraceClick(
                                residentialGracePeriodSaved ? { edit: true } : undefined
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                <Calendar className="w-6 h-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="truncate text-[12px] font-bold text-white">
                                {residentialGracePeriodSaved ? 'تعديل المهلة' : 'مهلة'}
                            </span>
                            <span className="sr-only">المدة وتاريخ الانتهاء</span>
                        </div>
                    </motion.button>
                ) : null}

                {showEvictionFieldworkRequests ? (
                <div
                    className={`relative rounded-2xl border border-white/10 bg-black/10 ${
                        inlineExpandedByBranch['Field Visit Date'] && isBranchInProgress('Field Visit Date')
                            ? 'overflow-visible'
                            : 'overflow-hidden'
                    }`}
                >
                    <motion.button
                        type="button"
                        disabled={locked && !isBranchActionable('Field Visit Date')}
                        aria-expanded={Boolean(
                            inlineExpandedByBranch['Field Visit Date'] &&
                                isBranchInProgress('Field Visit Date')
                        )}
                        className={`${BTN_BASE} ${TONE_FIELD_VISIT} ${locked && !isBranchActionable('Field Visit Date') ? BTN_DISABLED : ''} rounded-none border-0`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBranchPrimaryClick('Field Visit Date', () =>
                                setInlineActionGateKey('eviction_field_visit')
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                <Calendar className="h-6 w-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                تحديد موعد الخروج الميداني
                            </span>
                            {renderBranchChevron('Field Visit Date')}
                        </div>
                    </motion.button>
                    {!isBranchInProgress('Field Visit Date') ? (
                        <InlineActionGate
                            gateKey="eviction_field_visit"
                            activeKey={inlineActionGateKey}
                            mode={
                                isBranchWorkflowComplete('Field Visit Date')
                                    ? 'resubmit_warning'
                                    : 'initial'
                            }
                            onConfirm={() =>
                                submitEvictionRequest({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT,
                                    branch: 'Field Visit Date',
                                    timelineTitle: '📍 تحديد موعد الخروج الميداني',
                                    timelineDescription:
                                        'تم جدولة / تحديد موعد الخروج الميداني مع منفذ العدل (باشر).',
                                    requestTitle: 'طلب تحديد موعد الخروج الميداني',
                                    supersedeCompletedHub: isBranchWorkflowComplete('Field Visit Date'),
                                })
                            }
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    ) : null}
                    {renderEvictionBranchPanelBody(
                        'Field Visit Date',
                        'طلب تحديد موعد الخروج الميداني',
                        undefined,
                        () => setInlineActionGateKey('eviction_field_visit')
                    )}
                </div>
                ) : null}

                {showEvictionFieldworkRequests ? (
                <div
                    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                        inlineExpandedByBranch['Police Assistance Request'] ? 'overflow-visible' : ''
                    }`}
                >
                    <motion.button
                        type="button"
                        disabled={locked && !isBranchActionable('Police Assistance Request')}
                        aria-expanded={Boolean(
                            inlineExpandedByBranch['Police Assistance Request'] &&
                                isBranchInProgress('Police Assistance Request')
                        )}
                        className={`${BTN_BASE} ${TONE_POLICE} ${locked && !isBranchActionable('Police Assistance Request') ? BTN_DISABLED : ''} rounded-none border-0`}
                        ref={policeBtnRef}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBranchPrimaryClick('Police Assistance Request', () =>
                                setInlineActionGateKey('eviction_police_force')
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                <Shield className="h-6 w-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                القوة الجبرية
                            </span>
                            {renderBranchChevron('Police Assistance Request')}
                        </div>
                    </motion.button>
                    {!isBranchInProgress('Police Assistance Request') ? (
                        <InlineActionGate
                            gateKey="eviction_police_force"
                            activeKey={inlineActionGateKey}
                            mode={
                                isBranchWorkflowComplete('Police Assistance Request')
                                    ? 'resubmit_warning'
                                    : 'initial'
                            }
                            onConfirm={() =>
                                submitEvictionRequest({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE,
                                    branch: 'Police Assistance Request',
                                    timelineTitle: '🛡️ القوة الجبرية',
                                    timelineDescription:
                                        'طلب قوة جبرية مساندة للتنفيذ الميداني (قرار منفذ). عند الموافقة: احفظ الجهة المرافقة من بطاقة القرار.',
                                    requestTitle: 'مفاتحة الشرطة للقوة الإجرائية',
                                    supersedeCompletedHub: isBranchWorkflowComplete(
                                        'Police Assistance Request'
                                    ),
                                })
                            }
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    ) : null}
                    {renderEvictionBranchPanelBody(
                        'Police Assistance Request',
                        'طلب القوة الجبرية',
                        undefined,
                        () => setInlineActionGateKey('eviction_police_force')
                    )}
                </div>
                ) : null}

                {showResidentialGraceEarlyEndRequest && (
                    <div
                        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                            inlineExpandedByBranch['Residential Grace Early End'] ? 'overflow-visible' : ''
                        }`}
                    >
                        <motion.button
                            type="button"
                            disabled={locked && !isBranchActionable('Residential Grace Early End')}
                            aria-expanded={Boolean(
                                inlineExpandedByBranch['Residential Grace Early End'] &&
                                    isBranchInProgress('Residential Grace Early End')
                            )}
                            className={`${BTN_BASE} ${TONE_EARLY_END} ${locked && !isBranchActionable('Residential Grace Early End') ? BTN_DISABLED : ''} rounded-none border-0`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBranchPrimaryClick('Residential Grace Early End', () =>
                                    setConfirmGate('early_end')
                                );
                            }}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                        >
                            <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                    <Timer className="h-6 w-6 text-white/70" strokeWidth={2} />
                                </div>
                                <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                    طلب إنهاء مهلة التخلية السكنية
                                </span>
                                {renderBranchChevron('Residential Grace Early End')}
                                <span className="sr-only">يظهر أثناء سريان مهلة سكنية مسجّلة فقط</span>
                            </div>
                        </motion.button>
                        <div
                            className={`absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl bg-slate-950/45 px-3 backdrop-blur-xl transition-opacity duration-150 ${
                                confirmGate === 'early_end' ? 'opacity-100' : 'pointer-events-none opacity-0'
                            }`}
                            role="presentation"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmBusy(true);
                                    try {
                                        submitEvictionRequest({
                                            actionId: EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END as any,
                                            branch: 'Residential Grace Early End',
                                            timelineTitle: '⏱️ طلب إنهاء مهلة التخلية السكنية (موافقة المنفذ)',
                                            timelineDescription:
                                                'طلب عرض على منفذ العدل لإنهاء مهلة التخلية السكنية قبل انتهاء المدة وإعادة دورة المهلة في الإضبارة عند الموافقة.',
                                            requestTitle: 'طلب إنهاء مهلة التخلية السكنية (موافقة المنفذ)',
                                            supersedeCompletedHub: isBranchWorkflowComplete(
                                                'Residential Grace Early End'
                                            ),
                                        });
                                    } finally {
                                        setConfirmBusy(false);
                                        setConfirmGate(null);
                                    }
                                }}
                                className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                            >
                                تأكيد وإرسال للقرارات
                            </button>
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmGate(null);
                                }}
                                className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                        </div>

                        {renderEvictionBranchPanelBody(
                            'Residential Grace Early End',
                            'طلب إنهاء مهلة التخلية السكنية',
                            undefined,
                            () => setConfirmGate('early_end')
                        )}
                    </div>
                )}

                {showBreakInventoryRequest ? (
                <div
                    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                        inlineExpandedByBranch['Lock Breaking & Inventory'] ? 'overflow-visible' : ''
                    }`}
                >
                    <motion.button
                        type="button"
                        disabled={locked && !isBranchActionable('Lock Breaking & Inventory')}
                        aria-expanded={Boolean(
                            inlineExpandedByBranch['Lock Breaking & Inventory'] &&
                                isBranchInProgress('Lock Breaking & Inventory')
                        )}
                        className={`${BTN_BASE} ${TONE_BREAK} ${locked && !isBranchActionable('Lock Breaking & Inventory') ? BTN_DISABLED : ''} rounded-none border-0`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleBranchPrimaryClick('Lock Breaking & Inventory', () =>
                                setInlineActionGateKey('eviction_break_inventory')
                            );
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                <Hammer className="h-6 w-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                طلب كسر الأقفال وجرد الأثاث
                            </span>
                            {renderBranchChevron('Lock Breaking & Inventory')}
                        </div>
                    </motion.button>
                    {!isBranchInProgress('Lock Breaking & Inventory') ? (
                        <InlineActionGate
                            gateKey="eviction_break_inventory"
                            activeKey={inlineActionGateKey}
                            mode={
                                isBranchWorkflowComplete('Lock Breaking & Inventory')
                                    ? 'resubmit_warning'
                                    : 'initial'
                            }
                            onConfirm={() =>
                                submitEvictionRequest({
                                    actionId: EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY,
                                    branch: 'Lock Breaking & Inventory',
                                    timelineTitle: '🔨 طلب كسر الأقفال وجرد الأثاث',
                                    timelineDescription:
                                        'طلب عرض على منفذ العدل بشأن كسر الأقفال وجرد محتويات المنقولات في العين المؤجرة.',
                                    requestTitle: 'طلب كسر الأقفال وجرد الأثاث',
                                    supersedeCompletedHub: isBranchWorkflowComplete(
                                        'Lock Breaking & Inventory'
                                    ),
                                })
                            }
                            onCancel={() => setInlineActionGateKey(null)}
                        />
                    ) : null}
                    {renderEvictionBranchPanelBody(
                        'Lock Breaking & Inventory',
                        'طلب كسر الأقفال وجرد الأثاث',
                        undefined,
                        () => setInlineActionGateKey('eviction_break_inventory')
                    )}
                </div>
                ) : null}

                {hasBreak && showEvictionFieldworkRequests && (
                    <div
                        className={`relative overflow-hidden rounded-2xl border border-white/10 bg-black/10 ${
                            inlineExpandedByBranch['Judicial Custodian'] ? 'overflow-visible' : ''
                        }`}
                    >
                        <motion.button
                            type="button"
                            disabled={locked && !isBranchActionable('Judicial Custodian')}
                            aria-expanded={Boolean(
                                inlineExpandedByBranch['Judicial Custodian'] &&
                                    isBranchInProgress('Judicial Custodian')
                            )}
                            className={`${BTN_BASE} ${TONE_CUSTODIAN} ${locked && !isBranchActionable('Judicial Custodian') ? BTN_DISABLED : ''} rounded-none border-0`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBranchPrimaryClick('Judicial Custodian', () =>
                                    setConfirmGate('custodian')
                                );
                            }}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                        >
                            <div className="flex w-full flex-row-reverse items-center gap-3 min-w-0">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5">
                                    <UserCheck className="h-6 w-6 text-white/70" strokeWidth={2} />
                                </div>
                                <span className="min-w-0 flex-1 truncate text-right text-[12px] font-bold text-white">
                                    تنصيب حارس قضائي
                                </span>
                                {renderBranchChevron('Judicial Custodian')}
                                <span className="sr-only">
                                    يظهر بعد تسجيل طلب كسر الأقفال والجرد — يمكن تكرار الطلب بعد التعيين
                                </span>
                            </div>
                        </motion.button>
                        <div
                            className={`absolute inset-0 z-20 flex items-center justify-center gap-2 rounded-2xl bg-slate-950/45 px-3 backdrop-blur-xl transition-opacity duration-150 ${
                                confirmGate === 'custodian' ? 'opacity-100' : 'pointer-events-none opacity-0'
                            }`}
                            role="presentation"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmBusy(true);
                                    try {
                                        submitEvictionRequest({
                                            actionId: EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN,
                                            branch: 'Judicial Custodian',
                                            timelineTitle: '👤 طلب تنصيب حارس قضائي',
                                            timelineDescription: 'طلب عرض على منفذ العدل لتنصيب حارس قضائي على العين.',
                                            requestTitle: 'طلب تنصيب حارس قضائي',
                                            supersedeCompletedHub: isBranchWorkflowComplete(
                                                'Judicial Custodian'
                                            ),
                                        });
                                    } finally {
                                        setConfirmBusy(false);
                                        setConfirmGate(null);
                                    }
                                }}
                                className="rounded-xl border border-amber-500 bg-amber-600/20 px-3 py-2 text-[11px] font-black text-amber-100 hover:bg-amber-600/25 disabled:opacity-50"
                            >
                                تأكيد وإرسال للقرارات
                            </button>
                            <button
                                type="button"
                                disabled={confirmBusy}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirmBusy) return;
                                    setConfirmGate(null);
                                }}
                                className="rounded-xl bg-slate-800 px-3 py-2 text-[11px] font-bold text-slate-100 hover:bg-slate-700 disabled:opacity-50"
                            >
                                إلغاء
                            </button>
                        </div>

                        {renderEvictionBranchPanelBody(
                            'Judicial Custodian',
                            'طلب تنصيب حارس قضائي',
                            <button
                                type="button"
                                disabled={locked}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    tryOpenPendingCustodianDetails?.();
                                }}
                                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-bold text-emerald-100 disabled:opacity-40"
                            >
                                متابعة حفظ بيانات الحارس
                            </button>,
                            () => setConfirmGate('custodian')
                        )}
                    </div>
                )}
   </motion.div>
        </div>
    );
});

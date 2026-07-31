import React from 'react';
import { Sofa } from 'lucide-react';
import type { TimelineEvent } from '@/app/types/execution';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import type { MaritalFurnitureItem, MaritalFurnitureDeliveryOutcome } from '@/app/types/maritalFurniture';
import {
    DECISIONS_RELOAD_EVENT,
    dispatchDecisionsReload,
    isExecutorRowRejectedAndFinal,
    resolveExecutorDecisionRowContext,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import {
    isMaritalDeliveryInventoryStepComplete,
    isMaritalDeliveryScheduleStepComplete,
    isMaritalFurnitureDeliveryWorkflowComplete,
    mergeMaritalDeliveryLifecycleSummaries,
    readFollowupMergedExecutorDecisions,
    resolveMaritalFurnitureDeliveryState,
    type MaritalFurnitureDeliveryMode,
} from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import { resolveFollowupDecisionsStorageId } from '@/app/utils/openDecisionsModalFromFollowup';
import { FollowupProcedureCard } from './FollowupProcedureCard';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { MaritalFurnitureDeliveryAfterApproveForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryAfterApproveForm';
import { runPersistMaritalFurnitureItemDeliveryOutcome } from '@/app/utils/maritalFurnitureDeliveryPersistence';
import type { InlineActionGateKey } from '../types';
import type { ExecutorRequestLifecycleSummary } from '@/app/utils/executorRequestLifecycle';

export interface MaritalFurnitureDeliveryProcedureCardProps {
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    executionData?: Record<string, unknown> | null;
    decisionRows?: Record<string, unknown>[];
    mode: MaritalFurnitureDeliveryMode;
    unifiedRow: Record<string, unknown> | null;
    fieldVisitRow: Record<string, unknown> | null;
    breakInventoryRow: Record<string, unknown> | null;
    lifecycleUnified: ExecutorRequestLifecycleSummary | null;
    lifecycleFieldVisit: ExecutorRequestLifecycleSummary | null;
    lifecycleBreakInventory: ExecutorRequestLifecycleSummary | null;
    maritalFurnitureItems: MaritalFurnitureItem[];
    inlineActionGateKey: InlineActionGateKey | null;
    setInlineActionGateKey: (key: InlineActionGateKey | null) => void;
    expanded: boolean;
    onToggleExpanded: () => void;
    disabled?: boolean;
    appendEvictionProcedure: (procedure: {
        actionId: EvictionTimelineActionId;
        title: string;
        description: string;
        supersedeCompletedHub?: boolean;
    }) => boolean;
    maritalDeliveryActionId: EvictionTimelineActionId;
    saveMaritalFurnitureDeliveryInventory?: (input: {
        decisionId: string;
        items: MaritalFurnitureItem[];
    }) => void;
    finalizeBreakInventoryRequest?: (input: { decisionId: string }) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    persistExecutionMerge?: (patch: Record<string, unknown>) => void;
    pushTimelineEvent?: (event: TimelineEvent) => void;
    nextTimelineId?: () => string;
    openAppeals: (decisionId: string, decisionRow?: Record<string, unknown> | null) => void;
}

function rowApproved(
    row: Record<string, unknown> | null | undefined,
    allDecisions: Record<string, unknown>[]
): boolean {
    return Boolean(
        row?.id &&
            isExecutorRowApprovedWorkflowActive(row, allDecisions) &&
            !isExecutorRowRejectedAndFinal(row)
    );
}

function rowPending(row: Record<string, unknown> | null | undefined): boolean {
    if (!row?.id) return false;
    const o = String(row.executorOutcome ?? 'pending').trim();
    return !o || o === 'pending';
}

function rowRejected(row: Record<string, unknown> | null | undefined): boolean {
    return Boolean(row?.id && isExecutorRowRejectedAndFinal(row));
}

function resolvePanelStorageExecutionId(
    hint: string | undefined,
    decisionId: string
): string | undefined {
    const h = String(hint || '').trim();
    if (!decisionId) return h || undefined;
    const ctx = resolveExecutorDecisionRowContext(h, decisionId);
    return String(ctx?.storageExecutionId || h).trim() || undefined;
}

function MaritalFurnitureExecutorStepPanel({
    storageExecutionId,
    row,
    openAppeals,
    onResolved,
}: {
    storageExecutionId: string | undefined;
    row: Record<string, unknown> | null | undefined;
    openAppeals: (decisionId: string, decisionRow?: Record<string, unknown> | null) => void;
    onResolved?: () => void;
}) {
    if (!row?.id) return null;
    const decisionId = String(row.id || '').trim();
    const resolvedStorageId = resolvePanelStorageExecutionId(storageExecutionId, decisionId);
    const pending = rowPending(row);
    const rejected = rowRejected(row);

    if (!pending && !rejected) return null;

    return (
        <ExecutionInlineExecutorDecisionActions
            executionId={resolvedStorageId}
            decisionId={decisionId}
            decisionRow={row}
            requestKind="eviction_procedure"
            disabled={rejected}
            suppressNavigatorToast
            onResolved={(result) => {
                if (result.ok) {
                    dispatchDecisionsReload();
                    onResolved?.();
                }
            }}
            onOpenAppealCenter={
                rejected ? () => openAppeals(decisionId, row) : undefined
            }
        />
    );
}

export const MaritalFurnitureDeliveryProcedureCard: React.FC<
    MaritalFurnitureDeliveryProcedureCardProps
> = ({
    executionId,
    decisionsStorageExecutionId,
    executionData = null,
    decisionRows: decisionRowsProp,
    lifecycleUnified,
    lifecycleFieldVisit,
    lifecycleBreakInventory,
    maritalFurnitureItems,
    inlineActionGateKey,
    setInlineActionGateKey,
    expanded,
    onToggleExpanded,
    disabled = false,
    appendEvictionProcedure,
    maritalDeliveryActionId,
    saveMaritalFurnitureDeliveryInventory,
    finalizeBreakInventoryRequest,
    showToast,
    persistExecutionMerge,
    pushTimelineEvent,
    nextTimelineId,
    openAppeals,
}) => {
    const [reloadTick, setReloadTick] = React.useState(0);
    const executorStorageId = String(decisionsStorageExecutionId || executionId || '').trim() || undefined;

    React.useEffect(() => {
        const bump = () => setReloadTick((n) => n + 1);
        window.addEventListener(DECISIONS_RELOAD_EVENT, bump);
        window.addEventListener('hami-execution-decision-outcome', bump as EventListener);
        return () => {
            window.removeEventListener(DECISIONS_RELOAD_EVENT, bump);
            window.removeEventListener('hami-execution-decision-outcome', bump as EventListener);
        };
    }, []);

    const allDecisions = React.useMemo(
        () =>
            readFollowupMergedExecutorDecisions(
                decisionsStorageExecutionId || executionId,
                executionData,
                Array.isArray(decisionRowsProp) ? decisionRowsProp : []
            ),
        [decisionRowsProp, decisionsStorageExecutionId, executionId, executionData, reloadTick]
    );

    const deliveryState = React.useMemo(
        () => resolveMaritalFurnitureDeliveryState(allDecisions),
        [allDecisions]
    );

    const effectiveUnifiedRow = deliveryState.unifiedRow;
    const effectiveFieldVisitRow = deliveryState.fieldVisitRow;
    const effectiveBreakInventoryRow = deliveryState.breakInventoryRow;
    const effectiveMode = deliveryState.mode;

    const isUnified = effectiveMode === 'unified' && Boolean(effectiveUnifiedRow?.id);
    const scheduleRow = isUnified ? effectiveUnifiedRow : effectiveFieldVisitRow;
    const inventoryRow = isUnified ? effectiveUnifiedRow : effectiveBreakInventoryRow;

    const workflowComplete = isMaritalFurnitureDeliveryWorkflowComplete(
        effectiveMode,
        effectiveUnifiedRow,
        effectiveFieldVisitRow,
        effectiveBreakInventoryRow
    );

    const scheduleComplete = isMaritalDeliveryScheduleStepComplete(scheduleRow);
    const inventoryComplete = isMaritalDeliveryInventoryStepComplete(inventoryRow);

    const hasAnyRow =
        Boolean(effectiveUnifiedRow?.id) ||
        Boolean(effectiveFieldVisitRow?.id) ||
        Boolean(effectiveBreakInventoryRow?.id);

    const hasActiveRequest = hasAnyRow && !workflowComplete;

    React.useEffect(() => {
        if (hasActiveRequest && !expanded) {
            onToggleExpanded();
        }
    }, [hasActiveRequest, hasAnyRow, expanded, onToggleExpanded]);

    const scheduleLabel = String(
        (scheduleRow as { executorScheduleLabel?: string } | null)?.executorScheduleLabel || ''
    ).trim();

    const lifecycleSummary = isUnified
        ? lifecycleUnified
        : mergeMaritalDeliveryLifecycleSummaries(lifecycleFieldVisit, lifecycleBreakInventory);

    const governingRow = isUnified
        ? effectiveUnifiedRow
        : effectiveFieldVisitRow ?? effectiveBreakInventoryRow;

    const executorAllApproved = Boolean(governingRow?.id && rowApproved(governingRow, allDecisions));
    const executorAnyPending = Boolean(governingRow?.id && rowPending(governingRow));
    const executorAnyRejected = Boolean(governingRow?.id && rowRejected(governingRow));
    const executorStepDone = executorAllApproved && !executorAnyPending;
    const executorStepActive = executorAnyPending || executorAnyRejected;

    const deliveryStepComplete =
        scheduleComplete && inventoryComplete && Boolean(inventoryRow?.id);
    const deliveryStepActive =
        executorStepDone && rowApproved(scheduleRow, allDecisions) && !deliveryStepComplete;

    const scheduleStorageId = React.useMemo(
        () =>
            resolveFollowupDecisionsStorageId({
                storageExecutionId: decisionsStorageExecutionId || executionId,
                decisionId: String(scheduleRow?.id || ''),
                decisionRow: scheduleRow,
                executionData,
            }),
        [decisionsStorageExecutionId, executionId, scheduleRow, executionData]
    );

    const bumpReload = () => setReloadTick((n) => n + 1);

    const handleItemDeliveryOutcome = React.useCallback(
        (input: {
            itemId: string;
            outcome: Exclude<MaritalFurnitureDeliveryOutcome, 'pending'>;
            decisionId: string;
        }) => {
            if (!persistExecutionMerge) {
                showToast('تعذر حفظ حالة التسليم — الإضبارة غير جاهزة', 'error');
                return;
            }
            const ok = runPersistMaritalFurnitureItemDeliveryOutcome(
                {
                    itemId: input.itemId,
                    outcome: input.outcome,
                    decisionId: input.decisionId,
                    decisionsStorageId: scheduleStorageId,
                },
                {
                    executionData,
                    items: maritalFurnitureItems,
                    persistExecutionMerge,
                    pushTimelineEvent,
                    nextTimelineId,
                    showToast,
                },
            );
            if (ok) bumpReload();
        },
        [executionData, maritalFurnitureItems, persistExecutionMerge, pushTimelineEvent, nextTimelineId, showToast, scheduleStorageId],
    );

    const executorContent =
        executorStepActive && governingRow?.id ? (
            <MaritalFurnitureExecutorStepPanel
                storageExecutionId={executorStorageId}
                row={governingRow}
                openAppeals={openAppeals}
                onResolved={bumpReload}
            />
        ) : null;

    const deliveryContent =
        deliveryStepActive && scheduleRow?.id ? (
            <MaritalFurnitureDeliveryAfterApproveForm
                row={scheduleRow}
                decisionsStorageExecutionId={scheduleStorageId}
                executionData={executionData}
                maritalFurnitureItems={maritalFurnitureItems}
                disabled={disabled}
                showToast={showToast}
                persistExecutionMerge={persistExecutionMerge}
                pushTimelineEvent={pushTimelineEvent}
                nextTimelineId={nextTimelineId}
                saveMaritalFurnitureDeliveryInventory={saveMaritalFurnitureDeliveryInventory}
                onItemDeliveryOutcome={persistExecutionMerge ? handleItemDeliveryOutcome : undefined}
                finalizeBreakInventoryRequest={finalizeBreakInventoryRequest}
                onSaved={bumpReload}
            />
        ) : deliveryStepComplete && scheduleLabel ? (
            <p className="text-[10px] text-emerald-300/90 text-right">{scheduleLabel}</p>
        ) : null;

    const steps: ExecutionInlineStep[] = [
        {
            id: 'sent',
            title: 'إرسال طلب تسليم الأثاث',
            subtitle: isUnified ? 'طلب واحد لمنفذ العدل' : 'طلبات سابقة — قرار موحّد أدناه',
            status: hasAnyRow ? 'done' : 'locked',
            tone: 'success',
        },
        {
            id: 'executor',
            title: 'قرار المنفذ',
            subtitle: executorStepDone
                ? 'تم اعتماد طلب التسليم'
                : executorAnyRejected
                  ? 'مرفوض — راجع التفاصيل أو قدّم طعناً'
                  : hasAnyRow
                    ? 'بانتظار موافقة المنفذ على طلب التسليم'
                    : 'أرسل الطلب أولاً',
            status: hasAnyRow
                ? executorStepActive
                    ? 'active'
                    : executorStepDone
                      ? 'done'
                      : 'locked'
                : 'locked',
            tone: executorAnyRejected ? 'danger' : executorStepDone ? 'success' : 'neutral',
            content: executorContent ?? undefined,
        },
        {
            id: 'delivery',
            title: 'موعد التسليم والجرد',
            subtitle: deliveryStepComplete
                ? 'اكتمل الموعد والجرد والتسليم'
                : deliveryStepActive
                  ? 'حدّد الموعد ثم سجّل حالة كل قطعة'
                  : 'بعد اعتماد المنفذ',
            status: deliveryStepComplete ? 'done' : deliveryStepActive ? 'active' : 'locked',
            tone: deliveryStepComplete ? 'success' : 'neutral',
            content: deliveryContent ?? undefined,
        },
    ];

    const panelBody = (
        <div className="px-3 pb-3 pt-2" dir="rtl">
            <ExecutionInlineAccordion steps={steps} />
        </div>
    );

    return (
        <FollowupProcedureCard
            label="تسليم أثاث"
            subtitle={!hasAnyRow ? 'تحديد الموعد + جرد وتسليم قطع الأثاث الزوجية' : undefined}
            icon={
                <span className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#E6C673]/10 shrink-0">
                    <Sofa className="w-6 h-6 text-[#E6C673]/90" />
                </span>
            }
            gateKey="marital_furniture_delivery"
            inlineActionGateKey={inlineActionGateKey}
            setInlineActionGateKey={setInlineActionGateKey}
            hasActiveRequest={hasActiveRequest}
            expanded={expanded}
            onToggleExpanded={onToggleExpanded}
            workflowComplete={workflowComplete}
            lifecycleSummary={lifecycleSummary}
            disabled={disabled}
            resubmitWarningMessage="سبق إتمام مسار تسليم الأثاث. يمكنك تقديم دورة جديدة أو التراجع."
            onConfirmSend={({ resubmit } = {}) => {
                const ok = appendEvictionProcedure({
                    actionId: maritalDeliveryActionId,
                    title: '🛋️ طلب تسليم أثاث',
                    description:
                        'طلب موحّد لمنفذ العدل: تحديد موعد التسليم الميداني وجرد قطع الأثاث الزوجية وتسجيل حالة التسليم.',
                    supersedeCompletedHub: resubmit,
                });
                if (!ok) return;
                bumpReload();
                dispatchDecisionsReload();
                if (!expanded) {
                    onToggleExpanded();
                }
            }}
            panelBody={hasAnyRow ? panelBody : undefined}
        />
    );
};

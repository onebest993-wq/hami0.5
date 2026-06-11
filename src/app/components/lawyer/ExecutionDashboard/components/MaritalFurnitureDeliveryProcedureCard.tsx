import React from 'react';
import { CheckCircle, Clock, Lock, Sofa, XCircle } from 'lucide-react';
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import {
    dispatchDecisionsReload,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildArabicScheduleLabel,
    isMaritalDeliveryInventoryStepComplete,
    isMaritalDeliveryScheduleStepComplete,
    isMaritalFurnitureDeliveryWorkflowComplete,
    isScheduleYmdReached,
    mergeMaritalDeliveryLifecycleSummaries,
    readFieldVisitScheduleYmd,
    type MaritalFurnitureDeliveryMode,
} from '@/app/utils/maritalFurnitureDeliveryWorkflow';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { syncExecutorDecisionResolution } from '@/app/utils/syncExecutorDecisionResolution';
import { FollowupProcedureCard } from './FollowupProcedureCard';
import {
    ExecutionInlineAccordion,
    ExecutionInlineExecutorDecisionActions,
    type ExecutionInlineStep,
} from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { MaritalFurnitureDeliveryInventoryForm } from '@/app/components/lawyer/execution/MaritalFurnitureDeliveryInventoryForm';
import type { InlineActionGateKey } from '../types';
import type { ExecutorRequestLifecycleSummary } from '@/app/utils/executorRequestLifecycle';

export interface MaritalFurnitureDeliveryProcedureCardProps {
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
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
    }) => void;
    maritalDeliveryActionId: EvictionTimelineActionId;
    saveMaritalFurnitureDeliveryInventory?: (input: {
        decisionId: string;
        items: MaritalFurnitureItem[];
    }) => void;
    finalizeBreakInventoryRequest?: (input: { decisionId: string }) => void;
    showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    openAppeals: (decisionId: string) => void;
}

function rowApproved(row: Record<string, unknown> | null | undefined): boolean {
    return Boolean(row?.id && isExecutorRowEffectivelyApproved(row) && !isExecutorRowRejectedAndFinal(row));
}

function rowPending(row: Record<string, unknown> | null | undefined): boolean {
    if (!row?.id) return false;
    const o = String(row.executorOutcome ?? 'pending').trim();
    return !o || o === 'pending';
}

function rowRejected(row: Record<string, unknown> | null | undefined): boolean {
    return Boolean(row?.id && isExecutorRowRejectedAndFinal(row));
}

function MaritalFurnitureUnifiedExecutorActions({
    executionId,
    rows,
    openAppeals,
}: {
    executionId: string | undefined;
    rows: Array<Record<string, unknown> | null | undefined>;
    openAppeals: (decisionId: string) => void;
}) {
    const activeRows = rows.filter((r) => r?.id) as Record<string, unknown>[];
    const pendingRows = activeRows.filter((r) => rowPending(r));
    const rejectedRows = activeRows.filter((r) => rowRejected(r));
    const allApproved = activeRows.length > 0 && activeRows.every((r) => rowApproved(r));
    const anyRejected = rejectedRows.length > 0;
    const anyPending = pendingRows.length > 0;
    const [busy, setBusy] = React.useState(false);

    const resolveAll = (outcome: 'approved' | 'rejected') => {
        if (!executionId || busy || pendingRows.length === 0) return;
        setBusy(true);
        try {
            for (const row of pendingRows) {
                const decisionId = String(row.id || '').trim();
                if (!decisionId) continue;
                syncExecutorDecisionResolution({
                    executionId,
                    decisionId,
                    resolution: outcome,
                    row,
                    suppressNavigatorToast: true,
                });
            }
            dispatchDecisionsReload();
        } finally {
            queueMicrotask(() => setBusy(false));
        }
    };

    const statusLabel = allApproved
        ? 'معتمد'
        : anyRejected
          ? 'مرفوض'
          : anyPending
            ? 'بانتظار المنفذ'
            : '—';

    const StatusIcon = anyRejected ? XCircle : allApproved ? CheckCircle : Clock;
    const statusCls = anyRejected
        ? 'text-rose-300 bg-rose-500/15 border-rose-500/25'
        : allApproved
          ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/25'
          : 'text-amber-300 bg-amber-500/15 border-amber-500/25';

    if (activeRows.length === 0) return null;

    return (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
            <div className="flex flex-row-reverse items-center justify-between gap-2">
                <p className="text-[11px] font-bold text-white text-right">قرار المنفذ على طلب تسليم الأثاث</p>
                <span
                    className={`inline-flex shrink-0 flex-row-reverse items-center gap-1 rounded-lg border px-2 py-0.5 text-[9px] font-bold ${statusCls}`}
                >
                    <StatusIcon size={11} />
                    {statusLabel}
                </span>
            </div>
            {anyPending && executionId ? (
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                            e.stopPropagation();
                            resolveAll('rejected');
                        }}
                        className="rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-[11px] font-extrabold text-rose-200 hover:bg-rose-500/15 disabled:opacity-40"
                    >
                        رفض
                    </button>
                    <button
                        type="button"
                        disabled={busy}
                        onClick={(e) => {
                            e.stopPropagation();
                            resolveAll('approved');
                        }}
                        className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[11px] font-extrabold text-emerald-200 hover:bg-emerald-500/15 disabled:opacity-40"
                    >
                        موافقة
                    </button>
                </div>
            ) : null}
            {anyRejected && rejectedRows[0] ? (
                <ExecutionInlineExecutorDecisionActions
                    executionId={executionId}
                    decisionId={String(rejectedRows[0].id || '').trim()}
                    requestKind="eviction_procedure"
                    disabled
                    onOpenAppealCenter={() =>
                        openAppeals(String(rejectedRows[0].id || '').trim())
                    }
                />
            ) : null}
        </div>
    );
}

export const MaritalFurnitureDeliveryProcedureCard: React.FC<
    MaritalFurnitureDeliveryProcedureCardProps
> = ({
    executionId,
    decisionsStorageExecutionId,
    mode,
    unifiedRow,
    fieldVisitRow,
    breakInventoryRow,
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
    openAppeals,
}) => {
    const [scheduleDraft, setScheduleDraft] = React.useState('');
    const [earlyDeliveryUnlocked, setEarlyDeliveryUnlocked] = React.useState(false);

    const isUnified = mode === 'unified' && Boolean(unifiedRow?.id);
    const scheduleRow = isUnified ? unifiedRow : fieldVisitRow;
    const inventoryRow = isUnified ? unifiedRow : breakInventoryRow;

    const workflowComplete = isMaritalFurnitureDeliveryWorkflowComplete(
        mode,
        unifiedRow,
        fieldVisitRow,
        breakInventoryRow
    );

    const scheduleComplete = isMaritalDeliveryScheduleStepComplete(scheduleRow);
    const inventoryComplete = isMaritalDeliveryInventoryStepComplete(inventoryRow);

    const hasAnyRow =
        Boolean(unifiedRow?.id) || Boolean(fieldVisitRow?.id) || Boolean(breakInventoryRow?.id);

    const hasActiveRequest = hasAnyRow && !workflowComplete;

    const scheduleYmd = readFieldVisitScheduleYmd(scheduleRow);
    const scheduleLabel = String(
        (scheduleRow as { executorScheduleLabel?: string } | null)?.executorScheduleLabel || ''
    ).trim();
    const scheduleReached =
        earlyDeliveryUnlocked || (scheduleYmd ? isScheduleYmdReached(scheduleYmd) : false);

    const lifecycleSummary = isUnified
        ? lifecycleUnified
        : mergeMaritalDeliveryLifecycleSummaries(lifecycleFieldVisit, lifecycleBreakInventory);

    const inventoryDecisionId = String(inventoryRow?.id || '').trim();
    const inventoryApproved = rowApproved(inventoryRow);
    const ledgerSaved = Boolean(
        String(
            (inventoryRow as { breakInventoryFurnitureLedgerAt?: string } | null)
                ?.breakInventoryFurnitureLedgerAt || ''
        ).trim()
    );
    const showDeliveryForm = inventoryApproved && Boolean(saveMaritalFurnitureDeliveryInventory);

    const executorRows = isUnified ? [unifiedRow] : [fieldVisitRow, breakInventoryRow];

    const executorRowsActive = executorRows.filter((r) => r?.id) as Record<string, unknown>[];
    const executorAllApproved =
        executorRowsActive.length > 0 && executorRowsActive.every((r) => rowApproved(r));
    const executorAnyPending = executorRowsActive.some((r) => rowPending(r));
    const executorAnyRejected = executorRowsActive.some((r) => rowRejected(r));
    const executorStepDone = executorAllApproved && !executorAnyPending;
    const executorStepActive = executorAnyPending || executorAnyRejected;

    const scheduleStepActive = executorStepDone && rowApproved(scheduleRow) && !scheduleComplete;
    const inventoryStepActive =
        executorStepDone && scheduleComplete && inventoryApproved && !inventoryComplete;

    const saveSchedule = () => {
        const decisionId = String(scheduleRow?.id || '').trim();
        const ymd = scheduleDraft.trim();
        if (!decisionId) return;
        if (!ymd) {
            showToast('أدخل تاريخ موعد التسليم', 'warning');
            return;
        }
        const displayAr = buildArabicScheduleLabel(ymd);
        const ok = patchExecutorDecisionRow(decisionsStorageExecutionId, decisionId, {
            executorScheduleYmd: ymd,
            executorScheduleLabel: `موعد التسليم: ${displayAr}`,
        });
        if (!ok) {
            showToast('تعذر تثبيت الموعد', 'error');
            return;
        }
        dispatchDecisionsReload();
        setScheduleDraft('');
        showToast('تم تثبيت موعد التسليم.', 'success');
    };

    const executorContent =
        isUnified && unifiedRow?.id ? (
            rowPending(unifiedRow) || rowRejected(unifiedRow) ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <ExecutionInlineExecutorDecisionActions
                        executionId={executionId}
                        decisionId={String(unifiedRow.id || '').trim()}
                        requestKind="eviction_procedure"
                        disabled={rowRejected(unifiedRow)}
                        onOpenAppealCenter={
                            rowRejected(unifiedRow)
                                ? () => openAppeals(String(unifiedRow.id || '').trim())
                                : undefined
                        }
                    />
                </div>
            ) : null
        ) : (
            <MaritalFurnitureUnifiedExecutorActions
                executionId={executionId}
                rows={executorRows}
                openAppeals={openAppeals}
            />
        );

    const scheduleContent =
        rowApproved(scheduleRow) && !scheduleComplete ? (
            <div className="space-y-2">
                <input
                    type="date"
                    min={getLocalTodayYmd()}
                    value={scheduleDraft}
                    onChange={(e) => setScheduleDraft(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                />
                <button
                    type="button"
                    disabled={disabled}
                    onClick={saveSchedule}
                    className="w-full rounded-xl bg-gradient-to-l from-[#E6C673] to-amber-600 py-2.5 text-[11px] font-black text-[#0A0F1C] disabled:opacity-40"
                >
                    تأكيد موعد التسليم
                </button>
            </div>
        ) : scheduleComplete && scheduleLabel ? (
            <p className="text-[10px] text-emerald-300/90 text-right">{scheduleLabel}</p>
        ) : null;

    const inventoryContent = showDeliveryForm ? (
        <div className="space-y-2">
            {!scheduleReached && scheduleYmd ? (
                <p className="flex flex-row-reverse items-center gap-1.5 text-[10px] text-amber-300/90">
                    <Lock size={12} />
                    يُفتح الجرد في أو بعد {scheduleYmd}
                </p>
            ) : null}
            <MaritalFurnitureDeliveryInventoryForm
                items={maritalFurnitureItems}
                disabled={disabled}
                ledgerSaved={ledgerSaved}
                scheduleLocked={Boolean(scheduleYmd) && !scheduleReached}
                scheduleLabel={scheduleLabel || scheduleYmd}
                onRequestEarlyDelivery={() => {
                    if (window.confirm('تسليم مبكر قبل موعد التسليم — هل أنت متأكد؟')) {
                        setEarlyDeliveryUnlocked(true);
                    }
                }}
                onSave={(items) =>
                    saveMaritalFurnitureDeliveryInventory!({
                        decisionId: inventoryDecisionId,
                        items,
                    })
                }
                onFinalize={() =>
                    finalizeBreakInventoryRequest?.({ decisionId: inventoryDecisionId })
                }
            />
        </div>
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
                  : 'بانتظار موافقة المنفذ على طلب التسليم',
            status: executorStepActive ? 'active' : executorStepDone ? 'done' : 'locked',
            tone: executorAnyRejected ? 'danger' : executorStepDone ? 'success' : 'neutral',
            content: executorContent,
        },
        {
            id: 'schedule',
            title: 'تثبيت موعد التسليم',
            subtitle: scheduleComplete
                ? 'تم تحديد الموعد'
                : scheduleStepActive
                  ? 'حدّد تاريخ الخروج الميداني للتسليم'
                  : 'بعد اعتماد المنفذ',
            status: scheduleComplete ? 'done' : scheduleStepActive ? 'active' : 'locked',
            tone: scheduleComplete ? 'success' : 'neutral',
            content: scheduleContent,
        },
        {
            id: 'inventory',
            title: 'جرد وتسليم قطع الأثاث',
            subtitle: inventoryComplete
                ? 'اكتمل الجرد والتسليم'
                : inventoryStepActive
                  ? 'سجّل حالة كل قطعة (مُسلَّم / غير مُسلَّم)'
                  : 'بعد تثبيت الموعد',
            status: inventoryComplete ? 'done' : inventoryStepActive ? 'active' : 'locked',
            tone: inventoryComplete ? 'success' : 'neutral',
            content: inventoryContent,
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
                appendEvictionProcedure({
                    actionId: maritalDeliveryActionId,
                    title: '🛋️ طلب تسليم أثاث',
                    description:
                        'طلب موحّد لمنفذ العدل: تحديد موعد التسليم الميداني وجرد قطع الأثاث الزوجية وتسجيل حالة التسليم.',
                    supersedeCompletedHub: resubmit,
                });
            }}
            panelBody={hasAnyRow ? panelBody : undefined}
        />
    );
};

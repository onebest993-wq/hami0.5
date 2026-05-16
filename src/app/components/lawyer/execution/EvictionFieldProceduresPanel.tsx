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
    getExecutorDecisionRowById,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { useExecutorDecisions } from '@/app/components/lawyer/ExecutionDashboard/hooks/useExecutorDecisions';
import { ExecutionInlineAccordion, ExecutionInlineExecutorDecisionActions, type ExecutionInlineStep } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { InlineActionGate } from '@/app/components/lawyer/ExecutionDashboard/components/InlineActionGate';
import type { InlineActionGateKey } from '@/app/components/lawyer/ExecutionDashboard/types';

export interface EvictionFieldProceduresPanelProps {
    locked: boolean;
    lockHint?: string;
    timelineEvents: TimelineEvent[];
    premisesUse: EvictionPremisesUse;
    decisionsStorageExecutionId: string;
    /** عقار سكني / منزل (استعمال سكني) — زر مهلة التخلية بجانب الخروج الميداني */
    showResidentialEvictionGraceButton?: boolean;
    onResidentialEvictionGraceClick?: () => void;
    /** مهلة سكنية سارية (بداية + نهاية ولم تنتهِ بعد) */
    showResidentialGraceEarlyEndRequest?: boolean;
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

export const EvictionFieldProceduresPanel = React.memo(function EvictionFieldProceduresPanel({
    locked,
    lockHint,
    timelineEvents,
    premisesUse,
    decisionsStorageExecutionId,
    showResidentialEvictionGraceButton,
    onResidentialEvictionGraceClick,
    showResidentialGraceEarlyEndRequest,
    showDebtorHeirsEvictionTools,
    heirsNotificationDateYmd = '',
    onHeirsNotificationDateYmdChange,
    onIssueHeirsExecutionNoticeMemo,
    onRecordAction,
    tryOpenPendingBreakInventoryLedger,
    tryOpenPendingCustodianDetails,
    openPoliceAssistanceDetails,
}: EvictionFieldProceduresPanelProps) {
    void premisesUse;
    const policeBtnRef = React.useRef<HTMLButtonElement | null>(null);
    const [scheduleDraftByDecisionId, setScheduleDraftByDecisionId] = React.useState<
        Record<string, { dateOnly: string; timeOptional: string; notes: string }>
    >({});
    const [scheduleSavingByDecisionId, setScheduleSavingByDecisionId] = React.useState<Record<string, boolean>>({});
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
    const fire = (actionId: EvictionTimelineActionId, title: string, description: string) => {
        if (locked) return;
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
    };

    const click =
        (actionId: EvictionTimelineActionId, title: string, description: string) =>
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            fire(actionId, title, description);
        };

    const { executionId: decisionsExecId, decisions } = useExecutorDecisions(decisionsStorageExecutionId);

    const toast = React.useCallback((message: string, type: 'success' | 'warning' | 'info' | 'error') => {
        try {
            window.dispatchEvent(new CustomEvent('hami-toast', { detail: { message, type } }));
        } catch {
            /* ignore */
        }
    }, []);

    const latestEvictionDecisionByBranch = useMemo(() => {
        const list = Array.isArray(decisions) ? (decisions as any[]) : [];
        const eviction = list
            .filter((d) => String(d?.requestKind || '') === 'eviction_procedure')
            .sort((a, b) => {
                const da = String(a?.resolvedAt ?? a?.date ?? '');
                const db = String(b?.resolvedAt ?? b?.date ?? '');
                return db.localeCompare(da, undefined, { numeric: true });
            });
        const map: Record<string, any> = {};
        for (const d of eviction) {
            const branch = inferExecutorApprovalDecisionType({
                title: String(d?.title || ''),
                requestKind: 'eviction_procedure',
                evictionWorkflowKey: d?.evictionWorkflowKey,
            });
            if (!map[branch]) map[branch] = d;
        }
        return map;
    }, [decisions]);

    const openAppeals = React.useCallback(
        (decisionId: string) => {
            if (!decisionsExecId || !decisionId) return;
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-open-decisions-modal', {
                        detail: { executionId: decisionsExecId, tab: 'appeals', decisionId },
                    })
                );
            } catch {
                /* ignore */
            }
        },
        [decisionsExecId]
    );

    const isBranchAlive = React.useCallback(
        (branch: string) => {
            const row = (latestEvictionDecisionByBranch as any)[branch];
            if (!row?.id) return false;
            const rejected = isExecutorRowRejectedAndFinal(row);
            const approved = isExecutorRowEffectivelyApproved(row);
            const pending =
                String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '';
            if (pending) return true;
            if (rejected) return false;
            if (branch === 'Field Visit Date') {
                const scheduleLabel = String(row.executorScheduleLabel || '').trim();
                return approved && scheduleLabel === '';
            }
            if (branch === 'Police Assistance Request') {
                const savedAt = String((row as any).policeAssistanceSavedAt || '').trim();
                return approved && savedAt === '';
            }
            if (branch === 'Lock Breaking & Inventory') {
                const finalizedAt = String((row as any).breakInventoryFurnitureFinalizedAt || '').trim();
                return approved && finalizedAt === '';
            }
            if (branch === 'Judicial Custodian') {
                const savedAt = String((row as any).judicialCustodianDetailsSavedAt || '').trim();
                return approved && savedAt === '';
            }
            if (branch === 'Residential Grace Early End') return false;
            return false;
        },
        [latestEvictionDecisionByBranch]
    );

    const isBranchNeedsCompletion = React.useCallback(
        (branch: string) => {
            const row = (latestEvictionDecisionByBranch as any)[branch];
            if (!row?.id) return false;
            const rejected = isExecutorRowRejectedAndFinal(row);
            const approved = isExecutorRowEffectivelyApproved(row);
            const pending =
                String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '';
            if (pending || rejected || !approved) return false;
            if (branch === 'Field Visit Date') {
                const scheduleLabel = String(row.executorScheduleLabel || '').trim();
                return scheduleLabel === '';
            }
            if (branch === 'Police Assistance Request') {
                const savedAt = String((row as any).policeAssistanceSavedAt || '').trim();
                return savedAt === '';
            }
            if (branch === 'Lock Breaking & Inventory') {
                const finalizedAt = String((row as any).breakInventoryFurnitureFinalizedAt || '').trim();
                return finalizedAt === '';
            }
            if (branch === 'Judicial Custodian') {
                const savedAt = String((row as any).judicialCustodianDetailsSavedAt || '').trim();
                return savedAt === '';
            }
            return false;
        },
        [latestEvictionDecisionByBranch]
    );

    const renderPendingDecisionStrip = React.useCallback(
        (branch: string) => {
            const row = (latestEvictionDecisionByBranch as any)[branch];
            if (!row?.id) return null;
            const decisionId = String(row.id || '').trim();
            if (!decisionId) return null;
            const rejected = isExecutorRowRejectedAndFinal(row);
            const approved = isExecutorRowEffectivelyApproved(row);
            const pending =
                String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '';
            if (!pending && !rejected) return null;
            if (approved && !rejected) return null;

            return (
                <div className="mt-2 rounded-2xl border p-3 border-white/10 bg-black/15">
                    <p className="text-[11px] font-black text-right text-slate-200">قرار المنفذ</p>
                    <p className="mt-1 text-[10px] text-slate-400 text-right">
                        {rejected ? 'تم رفض الطلب' : 'قيد البت'}
                    </p>
                    <div className="mt-3 border-t border-white/10 pt-3">
                        <ExecutionInlineExecutorDecisionActions
                            executionId={decisionsExecId}
                            decisionId={decisionId}
                            requestKind="eviction_procedure"
                            disabled={rejected}
                            onOpenAppealCenter={rejected ? () => openAppeals(decisionId) : undefined}
                        />
                    </div>
                </div>
            );
        },
        [decisionsExecId, latestEvictionDecisionByBranch, openAppeals]
    );

    React.useEffect(() => {
        const alive = new Set<string>([
            'Field Visit Date',
            'Police Assistance Request',
            'Residential Grace Early End',
            'Lock Breaking & Inventory',
            'Judicial Custodian',
        ].filter((b) => isBranchNeedsCompletion(b)));
        setInlineExpandedByBranch((prev) => {
            let changed = false;
            const next: Record<string, boolean> = {};
            for (const [k, v] of Object.entries(prev)) {
                if (!alive.has(k)) {
                    changed = true;
                    continue;
                }
                next[k] = v;
            }
            return changed ? next : prev;
        });
    }, [isBranchNeedsCompletion]);

    const submitEvictionRequest = React.useCallback(
        (input: {
            actionId: EvictionTimelineActionId;
            branch: string;
            timelineTitle: string;
            timelineDescription: string;
            requestTitle: string;
        }) => {
            if (locked) return;
            const execId = String(decisionsStorageExecutionId || '').trim();
            if (!execId || execId === 'undefined') return;

            if (isBranchAlive(input.branch)) {
                toast('يوجد طلب قائم لنفس الإجراء — استخدم زر التوسيع أسفل البطاقة.', 'info');
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
            });

            setInlineExpandedByBranch((prev) => ({ ...prev, [input.branch]: false }));
            toast(ok ? 'تم إرسال الطلب إلى المنفذ.' : 'يوجد طلب مماثل قيد البت.', ok ? 'success' : 'warning');
        },
        [
            decisionsStorageExecutionId,
            fire,
            isBranchAlive,
            locked,
            setInlineExpandedByBranch,
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

    const renderFieldVisitInline = (row: any) => {
        if (!row?.id) return null;
        const decisionId = String(row.id || '').trim();
        const rejected = isExecutorRowRejectedAndFinal(row);
        const approved = isExecutorRowEffectivelyApproved(row);
        const pending =
            String(row.executorOutcome ?? 'pending') === 'pending' || String(row.executorOutcome ?? '') === '';
        const scheduleLabel = String(row.executorScheduleLabel || '').trim();
        const scheduleReady = approved && !rejected && scheduleLabel === '';

        if (pending || rejected) return null;
        if (!approved) return null;
        if (scheduleLabel) return null;

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
                subtitle: scheduleLabel ? scheduleLabel : scheduleReady ? 'أدخل التاريخ/الوقت ثم احفظ' : 'مقفلة حتى موافقة المنفذ',
                status: scheduleLabel ? 'done' : scheduleReady ? 'active' : rejected ? 'locked' : 'locked',
                tone: scheduleLabel ? 'success' : rejected ? 'danger' : 'neutral',
                content: scheduleReady ? (
                    <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
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
                            <input
                                type="time"
                                value={draft.timeOptional}
                                onChange={(e) =>
                                    setScheduleDraftByDecisionId((prev) => ({
                                        ...prev,
                                        [decisionId]: { ...draft, timeOptional: e.target.value },
                                    }))
                                }
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-100"
                                style={{ direction: 'ltr' }}
                            />
                        </div>
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
                        <button
                            type="button"
                            disabled={!canSave}
                            onClick={() => {
                                if (!canSave) return;
                                const dateOnly = String(draft.dateOnly || '').trim();
                                const timeOptional = String(draft.timeOptional || '').trim();
                                const eventIso = timeOptional ? `${dateOnly}T${timeOptional}:00` : `${dateOnly}T12:00:00`;
                                const eventDateLabel = buildArabicDateLabel(dateOnly);
                                const timePart = timeOptional ? buildArabicTimeLabel(eventIso) : null;
                                const displayAr = timePart ? `${eventDateLabel} — ${timePart}` : eventDateLabel;

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
            <div className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3">
                <ExecutionInlineAccordion steps={steps} />
            </div>
        );
    };

    const renderInlineDecision = (branch: string, label: string, afterApprove?: React.ReactNode) => {
        const row = (latestEvictionDecisionByBranch as any)[branch];
        if (!row?.id) {
            if (branch !== 'Field Visit Date') return null;
            const steps: ExecutionInlineStep[] = [
                {
                    id: `debug:field-visit:none`,
                    title: 'DEBUG — Inline Accordion Mounted',
                    subtitle: `لا يوجد صف قرار مرتبط حالياً. key=${String(decisionsExecId || '')} decisions=${Array.isArray(decisions) ? decisions.length : 0}`,
                    status: 'active',
                    tone: 'danger',
                    content: (
                        <div className="text-[11px] text-rose-200 text-right">
                            هذا عرض إجباري للتأكد من تركيب المكوّن في DOM.
                        </div>
                    ),
                },
            ];
            return (
                <div className="mt-2 rounded-2xl border border-rose-500/50 bg-rose-950/10 p-3">
                    <ExecutionInlineAccordion steps={steps} />
                </div>
            );
        }
        if (!isBranchNeedsCompletion(branch)) return null;
        if (!inlineExpandedByBranch[branch]) return null;
        if (branch === 'Field Visit Date') {
            return renderFieldVisitInline(row);
        }
        const decisionId = String(row.id || '').trim();
        const approved = isExecutorRowEffectivelyApproved(row);
        if (!approved) return null;
        let effectiveAfterApprove: React.ReactNode = afterApprove ?? null;
        if (!effectiveAfterApprove && branch === 'Police Assistance Request') {
            const savedAt = String((row as any).policeAssistanceSavedAt || '').trim();
            if (!savedAt) {
                effectiveAfterApprove = (
                    <button
                        type="button"
                        disabled={locked}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            const requestTitle = String((row as any).title || 'القوة الجبرية').trim() || 'القوة الجبرية';
                            if (openPoliceAssistanceDetails) {
                                openPoliceAssistanceDetails({ decisionId, requestTitle });
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
                          title: 'الخطوة التالية',
                          subtitle: 'بعد الموافقة',
                          status: 'active',
                          tone: 'neutral',
                          content: effectiveAfterApprove,
                      } satisfies ExecutionInlineStep,
                  ]
                : []),
        ];

        return (
            <div className="mt-2 rounded-2xl border border-white/10 bg-black/15 p-3">
                <ExecutionInlineAccordion steps={steps} />
            </div>
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
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
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
                        title="مهلة — المدة وتاريخ الانتهاء"
                        aria-label="مهلة"
                        className={`${BTN_BASE} ${TONE_GRACE} ${locked ? BTN_DISABLED : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            onResidentialEvictionGraceClick();
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                <Calendar className="w-6 h-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="truncate text-[12px] font-bold text-white">مهلة</span>
                            <span className="sr-only">المدة وتاريخ الانتهاء</span>
                        </div>
                    </motion.button>
                ) : null}

                <div className="relative space-y-2">
                    <motion.button
                        type="button"
                        disabled={locked}
                        className={`${BTN_BASE} ${TONE_FIELD_VISIT} ${locked ? BTN_DISABLED : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            if (isBranchAlive('Field Visit Date')) {
                                toast('يوجد طلب قائم لنفس الإجراء.', 'info');
                                return;
                            }
                            setInlineActionGateKey('eviction_field_visit');
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                <Calendar className="w-6 h-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="truncate text-[12px] font-bold text-white">تحديد موعد الخروج الميداني</span>
                        </div>
                    </motion.button>
                    <InlineActionGate
                        gateKey="eviction_field_visit"
                        activeKey={inlineActionGateKey}
                        onConfirm={() =>
                            submitEvictionRequest({
                                actionId: EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT,
                                branch: 'Field Visit Date',
                                timelineTitle: '📍 تحديد موعد الخروج الميداني',
                                timelineDescription:
                                    'تم جدولة / تحديد موعد الخروج الميداني مع منفذ العدل (باشر).',
                                requestTitle: 'طلب تحديد موعد الخروج الميداني',
                            })
                        }
                        onCancel={() => setInlineActionGateKey(null)}
                    />

                    {renderPendingDecisionStrip('Field Visit Date')}

                    {isBranchNeedsCompletion('Field Visit Date') ? (
                        <button
                            type="button"
                            aria-label={
                                inlineExpandedByBranch['Field Visit Date'] ? 'تصغير التفاصيل' : 'توسيع التفاصيل'
                            }
                            aria-expanded={Boolean(inlineExpandedByBranch['Field Visit Date'])}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setInlineExpandedByBranch((prev) => ({
                                    ...prev,
                                    ['Field Visit Date']: !Boolean(prev['Field Visit Date']),
                                }));
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/10 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-black/20"
                        >
                            <ChevronDown
                                size={16}
                                className={`text-[#D4AF37]/80 transition-transform ${
                                    inlineExpandedByBranch['Field Visit Date'] ? 'rotate-180' : ''
                                }`}
                            />
                            {inlineExpandedByBranch['Field Visit Date'] ? 'تصغير' : 'توسيع'}
                        </button>
                    ) : null}

                    {renderInlineDecision('Field Visit Date', 'طلب تحديد موعد الخروج الميداني')}
                </div>

                <div className="relative space-y-2">
                    <motion.button
                        type="button"
                        disabled={locked}
                        className={`${BTN_BASE} ${TONE_POLICE} ${locked ? BTN_DISABLED : ''}`}
                        ref={policeBtnRef}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            if (isBranchAlive('Police Assistance Request')) {
                                toast('يوجد طلب قائم لنفس الإجراء.', 'info');
                                return;
                            }
                            setInlineActionGateKey('eviction_police_force');
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                <Shield className="w-6 h-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="truncate text-[12px] font-bold text-white">القوة الجبرية</span>
                        </div>
                    </motion.button>
                    <InlineActionGate
                        gateKey="eviction_police_force"
                        activeKey={inlineActionGateKey}
                        onConfirm={() =>
                            submitEvictionRequest({
                                actionId: EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE,
                                branch: 'Police Assistance Request',
                                timelineTitle: '🛡️ القوة الجبرية',
                                timelineDescription:
                                    'طلب قوة جبرية مساندة للتنفيذ الميداني (قرار منفذ). عند الموافقة: احفظ الجهة المرافقة من بطاقة القرار.',
                                requestTitle: 'مفاتحة الشرطة للقوة الإجرائية',
                            })
                        }
                        onCancel={() => setInlineActionGateKey(null)}
                    />

                    {renderPendingDecisionStrip('Police Assistance Request')}

                    {isBranchNeedsCompletion('Police Assistance Request') ? (
                        <button
                            type="button"
                            aria-label={
                                inlineExpandedByBranch['Police Assistance Request']
                                    ? 'تصغير التفاصيل'
                                    : 'توسيع التفاصيل'
                            }
                            aria-expanded={Boolean(inlineExpandedByBranch['Police Assistance Request'])}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setInlineExpandedByBranch((prev) => ({
                                    ...prev,
                                    ['Police Assistance Request']: !Boolean(prev['Police Assistance Request']),
                                }));
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/10 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-black/20"
                        >
                            <ChevronDown
                                size={16}
                                className={`text-[#D4AF37]/80 transition-transform ${
                                    inlineExpandedByBranch['Police Assistance Request'] ? 'rotate-180' : ''
                                }`}
                            />
                            {inlineExpandedByBranch['Police Assistance Request'] ? 'تصغير' : 'توسيع'}
                        </button>
                    ) : null}

                    {renderInlineDecision('Police Assistance Request', 'طلب القوة الجبرية')}
                </div>

                {showResidentialGraceEarlyEndRequest && (
                    <div className="relative space-y-2">
                        <motion.button
                            type="button"
                            disabled={locked}
                            className={`${BTN_BASE} ${TONE_EARLY_END} ${locked ? BTN_DISABLED : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (locked) return;
                                if (isBranchAlive('Residential Grace Early End')) {
                                    toast('يوجد طلب قائم لنفس الإجراء.', 'info');
                                    return;
                                }
                                setConfirmGate('early_end');
                            }}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                        >
                            <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                                <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                    <Timer className="w-6 h-6 text-white/70" strokeWidth={2} />
                                </div>
                                <span className="truncate text-[12px] font-bold text-white">
                                    طلب إنهاء مهلة التخلية السكنية
                                </span>
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

                        {renderPendingDecisionStrip('Residential Grace Early End')}
                    </div>
                )}
                {renderInlineDecision('Residential Grace Early End', 'طلب إنهاء مهلة التخلية السكنية')}

                <div className="relative space-y-2">
                    <motion.button
                        type="button"
                        disabled={locked}
                        className={`${BTN_BASE} ${TONE_BREAK} ${locked ? BTN_DISABLED : ''}`}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (locked) return;
                            if (isBranchAlive('Lock Breaking & Inventory')) {
                                toast('يوجد طلب قائم لنفس الإجراء.', 'info');
                                return;
                            }
                            setInlineActionGateKey('eviction_break_inventory');
                        }}
                        variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                    >
                        <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                <Hammer className="w-6 h-6 text-white/70" strokeWidth={2} />
                            </div>
                            <span className="truncate text-[12px] font-bold text-white">
                                طلب كسر الأقفال وجرد الأثاث
                            </span>
                        </div>
                    </motion.button>
                    <InlineActionGate
                        gateKey="eviction_break_inventory"
                        activeKey={inlineActionGateKey}
                        onConfirm={() =>
                            submitEvictionRequest({
                                actionId: EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY,
                                branch: 'Lock Breaking & Inventory',
                                timelineTitle: '🔨 طلب كسر الأقفال وجرد الأثاث',
                                timelineDescription:
                                    'طلب عرض على منفذ العدل بشأن كسر الأقفال وجرد محتويات المنقولات في العين المؤجرة.',
                                requestTitle: 'طلب كسر الأقفال وجرد الأثاث',
                            })
                        }
                        onCancel={() => setInlineActionGateKey(null)}
                    />

                    {renderPendingDecisionStrip('Lock Breaking & Inventory')}

                    {isBranchNeedsCompletion('Lock Breaking & Inventory') ? (
                        <button
                            type="button"
                            aria-label={
                                inlineExpandedByBranch['Lock Breaking & Inventory']
                                    ? 'تصغير التفاصيل'
                                    : 'توسيع التفاصيل'
                            }
                            aria-expanded={Boolean(inlineExpandedByBranch['Lock Breaking & Inventory'])}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setInlineExpandedByBranch((prev) => ({
                                    ...prev,
                                    ['Lock Breaking & Inventory']: !Boolean(prev['Lock Breaking & Inventory']),
                                }));
                            }}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/10 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-black/20"
                        >
                            <ChevronDown
                                size={16}
                                className={`text-[#D4AF37]/80 transition-transform ${
                                    inlineExpandedByBranch['Lock Breaking & Inventory'] ? 'rotate-180' : ''
                                }`}
                            />
                            {inlineExpandedByBranch['Lock Breaking & Inventory'] ? 'تصغير' : 'توسيع'}
                        </button>
                    ) : null}

                    {renderInlineDecision(
                        'Lock Breaking & Inventory',
                        'طلب كسر الأقفال وجرد الأثاث',
                        <button
                            type="button"
                            disabled={locked}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                tryOpenPendingBreakInventoryLedger?.();
                            }}
                            className="w-full rounded-xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-[11px] font-bold text-orange-100 disabled:opacity-40"
                        >
                            متابعة إدخال محضر الجرد
                        </button>
                    )}
                </div>

                {hasBreak && (
                    <div className="relative space-y-2">
                        <motion.button
                            type="button"
                            disabled={locked}
                            className={`${BTN_BASE} ${TONE_CUSTODIAN} ${locked ? BTN_DISABLED : ''}`}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (locked) return;
                                if (isBranchAlive('Judicial Custodian')) {
                                    toast('يوجد طلب قائم لنفس الإجراء.', 'info');
                                    return;
                                }
                                setConfirmGate('custodian');
                            }}
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                        >
                            <div className="flex items-center gap-3 flex-row-reverse min-w-0">
                                <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5">
                                    <UserCheck className="w-6 h-6 text-white/70" strokeWidth={2} />
                                </div>
                                <span className="truncate text-[12px] font-bold text-white">تنصيب حارس قضائي</span>
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

                        {renderPendingDecisionStrip('Judicial Custodian')}

                        {isBranchNeedsCompletion('Judicial Custodian') ? (
                            <button
                                type="button"
                                aria-label={
                                    inlineExpandedByBranch['Judicial Custodian'] ? 'تصغير التفاصيل' : 'توسيع التفاصيل'
                                }
                                aria-expanded={Boolean(inlineExpandedByBranch['Judicial Custodian'])}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setInlineExpandedByBranch((prev) => ({
                                        ...prev,
                                        ['Judicial Custodian']: !Boolean(prev['Judicial Custodian']),
                                    }));
                                }}
                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/10 py-2 text-[11px] font-bold text-slate-200 transition hover:bg-black/20"
                            >
                                <ChevronDown
                                    size={16}
                                    className={`text-[#D4AF37]/80 transition-transform ${
                                        inlineExpandedByBranch['Judicial Custodian'] ? 'rotate-180' : ''
                                    }`}
                                />
                                {inlineExpandedByBranch['Judicial Custodian'] ? 'تصغير' : 'توسيع'}
                            </button>
                        ) : null}

                        {renderInlineDecision(
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
                            </button>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
});

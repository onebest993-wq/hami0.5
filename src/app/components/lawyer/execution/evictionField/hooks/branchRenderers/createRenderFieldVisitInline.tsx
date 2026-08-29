import React from 'react';
import {
    fieldVisitAppointmentStorageKey,
} from '@/app/utils/executorApprovalWorkflow';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    dispatchDecisionsReload,
    getExecutorDecisionRowById,
    isExecutorRowRejectedAndFinal,
    patchExecutorDecisionRow,
} from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutorRowApprovedWorkflowActive } from '@/app/utils/executorRequestAppealSync';
import { ExecutionInlineAccordion, type ExecutionInlineStep } from '@/app/components/lawyer/ExecutionDashboard/components/ExecutionInlineAccordion';
import { FollowupSectionLinkCheckbox } from '@/app/components/lawyer/execution/FollowupSectionLinkCheckbox';
import { buildArabicDateLabel } from './arabicDateLabels';
import type { EvictionDecisionRow } from './evictionDecisionRowTypes';
import type { EvictionBranchRenderersCtx } from './evictionBranchRenderersCtx';

export function createRenderFieldVisitInline(ctx: EvictionBranchRenderersCtx) {
    const {
        decisions,
        scheduleDraftByDecisionId,
        setScheduleDraftByDecisionId,
        scheduleSavingByDecisionId,
        setScheduleSavingByDecisionId,
        linkFieldVisitToAppointments,
        setLinkFieldVisitToAppointments,
        appealSync,
        toast,
        decisionsExecId,
        collapseBranchPanel,
        policeBtnRef,
        renderRowFollowupBlock,
    } = ctx;

    return (row: EvictionDecisionRow) => {
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
                                    const updated = getExecutorDecisionRowById(
                                        decisionsExecId,
                                        decisionId,
                                    ) as EvictionDecisionRow | null;
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
}

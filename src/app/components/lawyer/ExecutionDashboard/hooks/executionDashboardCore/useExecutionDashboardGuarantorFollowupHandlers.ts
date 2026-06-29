// @ts-nocheck
/** Phase C — طلبات الكفيل + حجز المتابعة من محضر المتابعة */
import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent, Creditor } from '@/app/types/execution';
import { guarantorFollowupAwaitingDetailsSave } from '@/app/types/execution';
import {
    appendGuarantorFollowupRequest,
    appendPendingExecutorSeizureDecision,
    patchExecutorDecisionRow,
    readExecutorDecisionsArray,
    supersedeGuarantorRequestDecisionsForExecution,
} from '@/app/utils/executorSeizureDecisionQueue';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';

export type UseExecutionDashboardGuarantorFollowupHandlersParams = {
    decisionsStorageExecutionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    assignmentWorkspaceCtx: { activeDebtorKey: string | null | undefined };
    nextTimelineId: () => string;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    openGuarantorDetailsModal: () => void;
    openSeizureRequestsTabRef: MutableRefObject<(() => void) | null>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setShowCoerciveActionForm: Dispatch<SetStateAction<string | null>>;
    setSeizureDetailCompletion: Dispatch<SetStateAction<unknown>>;
    setShowUnifiedExecutionModal: (show: boolean) => void;
    setUnifiedModalTab: Dispatch<SetStateAction<string>>;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    persistExecutionMergeRef: MutableRefObject<((patch: Record<string, unknown>) => void) | null>;
    guarantorDetailsDecisionId: string | null;
    setGuarantorDetailsDecisionId: Dispatch<SetStateAction<string | null>>;
};

export function useExecutionDashboardGuarantorFollowupHandlers({
    decisionsStorageExecutionId,
    executionData,
    executionId,
    assignmentWorkspaceCtx,
    nextTimelineId,
    pushTimelineEvent,
    persistExecutionMerge,
    showToast,
    openGuarantorDetailsModal,
    openSeizureRequestsTabRef,
    setTimelineEvents,
    setShowCoerciveActionForm,
    setSeizureDetailCompletion,
    setShowUnifiedExecutionModal,
    setUnifiedModalTab,
    executionDataRef,
    persistExecutionMergeRef,
    guarantorDetailsDecisionId,
    setGuarantorDetailsDecisionId,
}: UseExecutionDashboardGuarantorFollowupHandlersParams) {
    const requestFollowupSeizureDecision = useCallback(
        (subtype: 'third_party' | 'notice', title: string, body: string) => {
            const exId = decisionsStorageExecutionId;
            if (!exId || exId === 'undefined') return;
            const rows = readExecutorDecisionsArray(exId) as Array<Record<string, unknown>>;
            const dup = rows.find(
                (r) =>
                    String(r.requestKind || '') === 'seizure' &&
                    String((r as { seizureSubtype?: string }).seizureSubtype || '') === subtype &&
                    (String((r as { executorOutcome?: string }).executorOutcome || '') === 'pending' ||
                        (r as { executorOutcome?: string }).executorOutcome === undefined),
            );
            if (dup?.id) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
                    decisionsLink: true,
                    decisionId: String((dup as { id?: string }).id),
                    decisionsTab: 'current',
                });
                return;
            }

            const decisionId = appendPendingExecutorSeizureDecision({
                executionId: exId,
                requestTitle: `${title} — قيد البت لدى المنفذ`,
                requestBody: body,
                seizureSubtype: subtype,
            });
            if (!decisionId) {
                showToast('يوجد طلب مماثل قيد البت لدى المنفذ.', 'warning', {
                    decisionsLink: true,
                    decisionsTab: 'current',
                });
                return;
            }

            const now = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: `📋 ${title} — قيد البت`,
                description: body,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: {
                    timelineThreadKey: `executor_decision:${decisionId}`,
                    decisionRowId: decisionId,
                },
            });

            showToast('تم إرسال الطلب إلى القرارات والطعون.', 'success', {
                decisionsLink: true,
                decisionId,
                decisionsTab: 'current',
            });
        },
        [decisionsStorageExecutionId, nextTimelineId, pushTimelineEvent, showToast],
    );

    const handleGuarantorRequestFromFollowup = useCallback(() => {
        if (guarantorFollowupAwaitingDetailsSave(executionData?.guarantor_followup)) {
            openGuarantorDetailsModal();
            return;
        }
        const gReq = appendGuarantorFollowupRequest({ executionId: decisionsStorageExecutionId });
        if (!gReq.ok) {
            showToast('يوجد طلب كفيل قيد البت لدى المنفذ.', 'warning', {
                decisionsLink: true,
                decisionsTab: 'current',
            });
            return;
        }
        if (gReq.decisionId) {
            const ts = new Date().toISOString();
            setTimelineEvents((prev) => [
                {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: 'طلب إدخال كفيل ضامن — قيد البت',
                    type: 'decision',
                    source: 'القرارات والطعون',
                    metadata: {
                        ...timelineDebtorMetadata(assignmentWorkspaceCtx.activeDebtorKey),
                        timelineThreadKey: `executor_decision:${gReq.decisionId}`,
                        decisionRowId: gReq.decisionId,
                    },
                },
                ...prev,
            ]);
        }
        showToast('تم إرسال طلب الكفيل إلى القرارات والطعون.', 'success', {
            decisionsLink: true,
            decisionId: gReq.decisionId,
            decisionsTab: 'current',
        });
    }, [
        assignmentWorkspaceCtx.activeDebtorKey,
        decisionsStorageExecutionId,
        executionData?.guarantor_followup,
        nextTimelineId,
        openGuarantorDetailsModal,
        setTimelineEvents,
        showToast,
    ]);

    const archiveAndClearGuarantor = useCallback(
        (reason: 'replace' | 'unlink') => {
            const gf = executionData?.guarantor_followup;
            if (!gf) return;
            const archivedAt = new Date().toISOString();
            const prevHist = Array.isArray(executionData?.guarantor_followup_history)
                ? executionData?.guarantor_followup_history
                : [];
            persistExecutionMerge({
                guarantor_followup: null,
                hasGuarantor: false,
                guarantor_followup_history: [{ ...gf, archivedAt }, ...prevHist],
            });
            supersedeGuarantorRequestDecisionsForExecution(decisionsStorageExecutionId);
            pushTimelineEvent({
                id: nextTimelineId(),
                date: archivedAt.slice(0, 10),
                timestamp: archivedAt,
                title: reason === 'replace' ? 'استبدال الكفيل الضامن' : 'فك الكفالة / حذف الكفيل',
                description:
                    reason === 'replace'
                        ? 'تمت أرشفة الكفيل الحالي وفتح مسار تسجيل كفيل جديد.'
                        : 'تم إنهاء ارتباط الكفيل بالإضبارة وأرشفة بياناته.',
                type: 'procedure',
                source: 'محضر المتابعة',
            });
        },
        [
            decisionsStorageExecutionId,
            executionData?.guarantor_followup,
            executionData?.guarantor_followup_history,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
        ],
    );

    const requestGuarantorSeizure = useCallback(
        (subtype: 'salary' | 'movable' | 'property', opts?: { inline?: boolean }) => {
            const inline = Boolean(opts?.inline);
            const gf = executionData?.guarantor_followup;
            if (!gf?.executor_approved) {
                showToast('لا يوجد كفيل معتمد من المنفذ.', 'warning');
                return;
            }
            const hasDetails =
                gf.details_saved === true ||
                (Boolean(String(gf.guarantor_name || '').trim()) &&
                    Boolean(String(gf.guarantor_workplace || '').trim()));
            if (!hasDetails) {
                showToast('أكمل بيانات الكفيل (الاسم وجهة العمل) أولاً.', 'warning');
                return;
            }
            const label =
                subtype === 'salary'
                    ? 'طلب حجز راتب الكفيل'
                    : subtype === 'property'
                      ? 'طلب حجز عقار الكفيل'
                      : 'طلب حجز أموال منقولة للكفيل';
            const body = [
                'طلب اتخاذ إجراءات الحجز على الكفيل الضامن.',
                gf.guarantor_name?.trim() ? `اسم الكفيل: ${gf.guarantor_name.trim()}` : null,
                gf.guarantor_workplace?.trim() ? `عنوان العمل: ${gf.guarantor_workplace.trim()}` : null,
            ]
                .filter(Boolean)
                .join('\n');
            const subtypeStored = subtype === 'movable' ? ('movable_auction' as const) : subtype;
            const did = appendPendingExecutorSeizureDecision({
                executionId: decisionsStorageExecutionId,
                requestTitle: label,
                requestBody: body,
                seizureSubtype: subtypeStored,
                seizureTarget: 'guarantor',
            });
            if (!did) {
                showToast('يوجد طلب مماثل قيد المعالجة.', 'warning', { decisionsLink: true });
                return;
            }
            const ts = new Date().toISOString();
            pushTimelineEvent({
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: `📌 ${label} — قيد البت`,
                description: body,
                type: 'decision',
                source: 'محضر المتابعة',
                metadata: { timelineThreadKey: `executor_decision:${did}`, decisionRowId: did },
            });
            if (!inline) {
                setShowCoerciveActionForm(null);
                setSeizureDetailCompletion(null);
                openSeizureRequestsTabRef.current?.();
                setShowUnifiedExecutionModal(true);
                try {
                    const exId = String(
                        decisionsStorageExecutionId ?? executionData?.id ?? executionId ?? '',
                    ).trim();
                    window.dispatchEvent(
                        new CustomEvent('hami-focus-guarantor-seizure-inline', {
                            detail: { executionId: exId, decisionId: did, kind: subtype },
                        }),
                    );
                    window.dispatchEvent(
                        new CustomEvent('hami-guarantor-seizure-request-created', {
                            detail: { executionId: exId, decisionId: did },
                        }),
                    );
                } catch {
                    /* ignore */
                }
            }
            showToast(
                inline
                    ? 'تم إرسال طلب حجز الكفيل — تابع الإكمال أدناه.'
                    : 'تم إنشاء طلب حجز الكفيل — أكمل المسار داخل طلبات الحجز.',
                'success',
                {
                    decisionsLink: true,
                    decisionId: did,
                    decisionsTab: 'current',
                },
            );
        },
        [
            decisionsStorageExecutionId,
            executionData?.guarantor_followup,
            executionData?.id,
            executionId,
            nextTimelineId,
            openSeizureRequestsTabRef,
            pushTimelineEvent,
            setSeizureDetailCompletion,
            setShowCoerciveActionForm,
            setShowUnifiedExecutionModal,
            setUnifiedModalTab,
            showToast,
        ],
    );

    const persistGuarantorFollowupDetails = useCallback(
        (
            guarantorName: string,
            guarantorWorkplace: string,
            opts?: { salaryIqd: number | null; deductionIqd: number | null },
        ): boolean => {
            const prev = executionDataRef.current?.guarantor_followup ?? executionData?.guarantor_followup;
            const name = guarantorName.trim();
            const wp = guarantorWorkplace.trim();
            if (!name || !wp) {
                showToast('أدخل اسم الكفيل ومكان العمل قبل الحفظ.', 'warning');
                return false;
            }
            if (!persistExecutionMergeRef.current) {
                showToast('تعذّر الحفظ — أعد فتح ملف التنفيذ.', 'error');
                return false;
            }
            const creditors = executionData?.creditors;
            let patchCreditors: Creditor[] | undefined;
            if (Array.isArray(creditors) && creditors.length > 0) {
                const c0 = creditors[0] as Creditor;
                patchCreditors = [{ ...c0, guarantorExecutionNotation: true }, ...creditors.slice(1)];
            }
            persistExecutionMerge({
                guarantor_followup: {
                    executor_approved: prev?.executor_approved ?? true,
                    channel: 'financial',
                    details_saved: true,
                    guarantee_type: 'amount',
                    guarantor_name: name,
                    guarantor_workplace: wp,
                    guarantor_salary_iqd:
                        opts?.salaryIqd !== undefined
                            ? opts.salaryIqd
                            : (prev?.guarantor_salary_iqd ?? null),
                    guarantor_deduction_iqd:
                        opts?.deductionIqd !== undefined
                            ? opts.deductionIqd
                            : (prev?.guarantor_deduction_iqd ?? null),
                    creditor_notation_registered: true,
                },
                debtor_executive_detention_active: false,
                executive_detention_until: null,
                executive_detention_days_total: null,
                executive_detention_reminder_sent: false,
                executive_detention_judge_outcome: null,
                executive_detention_judge_eligible_decision_id: null,
                executive_detention_judge_decision_id: null,
                executive_detention_request_in_absentia: false,
                debtor_travel_ban_active: false,
                ...(patchCreditors ? { creditors: patchCreditors } : {}),
            });
            const ts = new Date().toISOString();
            const sal = opts?.salaryIqd;
            const ded = opts?.deductionIqd;
            const gt = 'كفالة ضامنة للمبلغ';
            pushTimelineEvent({
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: 'تثبيت بيانات الكفيل الضامن',
                description: [
                    `نوع الكفالة: ${gt}`,
                    `الاسم: ${name}`,
                    `مكان العمل: ${wp}`,
                    sal != null ? `الراتب: ${sal.toLocaleString('ar-IQ')} د.ع` : null,
                    ded != null ? `الاستقطاع: ${ded.toLocaleString('ar-IQ')} د.ع` : null,
                ]
                    .filter(Boolean)
                    .join('\n'),
                type: 'procedure',
                source: 'محضر المتابعة',
            });
            const did = String(guarantorDetailsDecisionId || '').trim();
            if (did) {
                try {
                    patchExecutorDecisionRow(decisionsStorageExecutionId, did, {
                        guarantorDetailsSavedAt: ts,
                    } as Record<string, unknown>);
                } catch {
                    /* ignore */
                }
                setGuarantorDetailsDecisionId(null);
            }
            showToast('تم حفظ بيانات الكفيل وتسجيل تعليم الدائن.', 'success');
            try {
                const exId = String(executionDataRef.current?.id ?? executionData?.id ?? executionId ?? '').trim();
                window.dispatchEvent(
                    new CustomEvent('hami-guarantor-followup-committed', { detail: { executionId: exId } }),
                );
                window.dispatchEvent(
                    new CustomEvent('hami-guarantor-external-updated', {
                        detail: { executionId: exId, tab: 'financial' as const },
                    }),
                );
            } catch {
                /* ignore */
            }
            return true;
        },
        [
            decisionsStorageExecutionId,
            executionData?.creditors,
            executionData?.guarantor_followup,
            executionData?.id,
            executionDataRef,
            executionId,
            guarantorDetailsDecisionId,
            nextTimelineId,
            persistExecutionMerge,
            persistExecutionMergeRef,
            pushTimelineEvent,
            setGuarantorDetailsDecisionId,
            showToast,
        ],
    );

    return {
        requestFollowupSeizureDecision,
        handleGuarantorRequestFromFollowup,
        archiveAndClearGuarantor,
        requestGuarantorSeizure,
        persistGuarantorFollowupDetails,
    };
}

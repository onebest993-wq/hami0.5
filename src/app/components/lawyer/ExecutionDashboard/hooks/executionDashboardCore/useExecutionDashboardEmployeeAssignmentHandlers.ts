// @ts-nocheck
/** مسار تكليف حضور المدين الموظف — handlers محضر المتابعة والتبليغ */
import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    appendPersonalCoerciveExecutorRequest,
    closePersonalCoerciveSubtypeDecisionCycle,
} from '@/app/utils/executorSeizureDecisionQueue';
import { buildForcedBringPersonalOutcomePatch } from '@/app/components/lawyer/execution/forcedBringInvestigationLifecycle';
import {
    addCalendarDaysYmd,
    buildEmployeeAssignmentPatchForDebtorKey,
    computeTaklifDeadlineYmd,
    getEmployeeAssignmentForDebtorKey,
    isAssignmentDeadlinePassed,
} from '@/app/utils/employeeSummonsAssignment';
import { buildDebtorSummonsMarkerPatchForKey } from '@/app/utils/noticeDebtorScope';
import { buildPublicationNoticePatchForDebtorKey } from '@/app/utils/publicationNoticeDebtor';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';

export type UseExecutionDashboardEmployeeAssignmentHandlersParams = {
    executionData: ExecutionFile | null | undefined;
    unifiedSummonsTargetDebtorKey: string;
    primaryDebtorKeyResolved: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    forcedBringDecisionState: { approved: boolean; pending: boolean };
    employeeForcedBringAwaitingPersonalOutcome: boolean;
};

export function useExecutionDashboardEmployeeAssignmentHandlers({
    executionData,
    unifiedSummonsTargetDebtorKey,
    primaryDebtorKeyResolved,
    nextTimelineId,
    persistExecutionMerge,
    showToast,
    setTimelineEvents,
    forcedBringDecisionState,
    employeeForcedBringAwaitingPersonalOutcome,
}: UseExecutionDashboardEmployeeAssignmentHandlersParams) {
    const handleEmployeeAssignmentConfirm = useCallback(
        (p: { purpose: string; notifyDate: string; durationDays: number }) => {
            const d = executionData;
            if (!d?.id) return;
            const targetKey = unifiedSummonsTargetDebtorKey;
            const pk = primaryDebtorKeyResolved;
            const existing = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
            if (
                existing &&
                (existing.phase === 'active' ||
                    existing.phase === 'absent_declared' ||
                    existing.phase === 'investigation_pending' ||
                    existing.phase === 'warrant_ui')
            ) {
                showToast('يوجد تكليف مسجّل لهذا المدين — أنهِه أو أكمل المرحلة الحالية أولاً', 'warning');
                return;
            }
            const effectiveDurationDays = Math.max(1, Number(p.durationDays) || 1);
            const deadlineDate = computeTaklifDeadlineYmd(p.notifyDate, effectiveDurationDays);
            const ts = new Date().toISOString();
            const assignment = {
                phase: 'active' as const,
                assignedDebtorKey: targetKey,
                purpose: p.purpose,
                notifyDate: p.notifyDate,
                durationDays: effectiveDurationDays,
                deadlineDate,
                confirmedAt: ts,
                investigationDecisionId: null as string | null,
                investigationApproved: false,
                arrestOrderRecorded: false,
            };
            setTimelineEvents((prev) => {
                const ev: TimelineEvent = {
                    id: nextTimelineId(),
                    date: p.notifyDate,
                    timestamp: ts,
                    title: '📋 تكليف حضور — مدين موظف',
                    description: `الغاية: ${p.purpose}\nالمدة: ${effectiveDurationDays} أيام (من اليوم التالي لتاريخ التبليغ) — ينتهي ${deadlineDate}`,
                    type: 'summons',
                    source: 'التبليغ',
                    metadata: timelineDebtorMetadata(targetKey),
                };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, assignment, pk),
                    ...buildDebtorSummonsMarkerPatchForKey(d, targetKey, pk, null),
                    ...buildPublicationNoticePatchForDebtorKey(d, targetKey, null),
                    timelineEvents: next,
                });
                return next;
            });
            showToast('تم تسجيل التكليف بالحضور', 'success');
        },
        [
            unifiedSummonsTargetDebtorKey,
            executionData,
            executionData?.employee_summons_assignments_by_debtor,
            executionData?.employee_summons_assignment,
            executionData?.id,
            nextTimelineId,
            persistExecutionMerge,
            primaryDebtorKeyResolved,
            showToast,
        ]
    );

    const handleEmployeeAssignmentAttend = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a0 = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a0) return;
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '🟢 حضور المدين — تكليف بالحضور',
                description: 'سُجّل حضور المدين خلال مدة التكليف.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل الحضور وإنهاء التكليف', 'success');
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentDeclareAbsent = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a || a.phase !== 'active') return;
        const deadlineYmd =
            a.notifyDate != null && a.notifyDate !== ''
                ? computeTaklifDeadlineYmd(a.notifyDate, a.durationDays ?? 1)
                : a.deadlineDate || '';
        if (!deadlineYmd) return;
        if (!isAssignmentDeadlinePassed(deadlineYmd)) {
            showToast('تسجيل عدم الحضور يُتاح بعد انتهاء المدة التقويمية', 'warning');
            return;
        }
        const nextGen = (a.taklifCycleGeneration ?? 0) + 1;
        const resetAssignment = {
            ...a,
            phase: 'absent_declared' as const,
            taklifCycleGeneration: nextGen,
            investigationDecisionId: null as string | null,
            investigationApproved: false,
            arrestOrderRecorded: false,
        };
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '⚠ عدم حضور المدين — إعادة دورة التكليف',
                description: `سُجّل عدم الحضور بعد انتهاء المدة التقويمية للتكليف. دورة التكليف: ${nextGen}. أُعيدت مرحلة المفاتحة والتنفيذ الجبري للبداية ضمن نفس التكليف.`,
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(
                    d,
                    targetKey,
                    { ...resetAssignment, periodEndedAt: ts },
                    pk
                ),
                timelineEvents: next,
            });
            return next;
        });
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentTerminate = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a) return;
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '⏹ إنهاء تكليف الحضور (تسجيل يدوي)',
                description: 'أُنهي تكليف الحضور دون اكتمال المسار الآلي.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم إنهاء التكليف بالحضور', 'info');
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentRequestInvestigation = useCallback(() => {
        const d = executionData;
        const id = d?.id;
        if (!d || !id) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a) return;
        const deadlineForBody =
            a.deadlineDate ||
            (a.notifyDate != null &&
            a.notifyDate !== '' &&
            a.durationDays != null &&
            a.durationDays > 0
                ? addCalendarDaysYmd(a.notifyDate, a.durationDays)
                : '—');
        const body = `تكليف حضور (مدين موظف).\nالغاية: ${a.purpose || '—'}\nمرجع تاريخ التكليف: ${a.notifyDate || '—'}\nآخر أجل للمدة: ${deadlineForBody}`;
        const res = appendPersonalCoerciveExecutorRequest({
            executionId: id,
            subtype: 'employee_assignment_investigation',
            title: 'طلب مفاتحة محكمة التحقيق لإصدار أمر قبض — تكليف حضور (موظف)',
            body,
        });
        if (!res.ok || !res.decisionId) {
            showToast('تعذّر إدراج الطلب في القرارات', 'error');
            return;
        }
        const decisionId = res.decisionId;
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '📤 طلب مفاتحة التحقيق — تكليف حضور',
                description: 'أُرسل طلب مفاتحة محكمة التحقيق لإصدار أمر قبض ضمن مسار التكليف بالحضور.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(
                    d,
                    targetKey,
                    {
                        ...a,
                        phase: 'investigation_pending',
                        investigationDecisionId: decisionId,
                    },
                    pk
                ),
                timelineEvents: next,
            });
            return next;
        });
        showToast('أُرسل الطلب إلى القرارات والطعون', 'success', { decisionsLink: true });
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        executionData?.id,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeAssignmentRequestForcedBring = useCallback(() => {
        const d = executionData;
        const id = d?.id;
        if (!d || !id) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a || a.phase !== 'warrant_ui' || !a.arrestOrderRecorded) return;
        const res = appendPersonalCoerciveExecutorRequest({
            executionId: id,
            subtype: 'forced_bring_in',
            title: 'طلب إحضار جبري للمدين — بعد أمر قبض (تكليف حضور)',
            body: `تكليف حضور.\nالغاية: ${a.purpose || '—'}\nطلب إحضار جبري بعد تسجيل صدور أمر القبض ضمن مسار التكليف.`,
        });
        if (!res.ok || !res.decisionId) {
            showToast('تعذّر إدراج طلب الإحضار في القرارات', 'error');
            return;
        }
        const ts = new Date().toISOString();
        setTimelineEvents((prev) => {
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '📤 طلب إحضار جبري — تكليف حضور',
                description: 'أُرسل طلب إحضار جبري إلى منفذ العدل ضمن مسار التكليف بعد أمر القبض.',
                type: 'summons',
                source: 'التبليغ',
                metadata: {
                    ...timelineDebtorMetadata(targetKey),
                    timelineThreadKey: `executor_decision:${res.decisionId}`,
                    decisionRowId: res.decisionId,
                },
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                forcedAttendanceIssued: true,
                activeNoticeState: 'forced_attendance',
                timelineEvents: next,
            });
            return next;
        });
        showToast('أُرسل طلب الإحضار إلى القرارات والطعون', 'success', { decisionsLink: true });
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        executionData?.id,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeRegisterArrestOrder = useCallback(() => {
        const d = executionData;
        if (!d) return;
        const targetKey = unifiedSummonsTargetDebtorKey;
        const pk = primaryDebtorKeyResolved;
        const a = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
        if (!a) return;
        setTimelineEvents((prev) => {
            const ts = new Date().toISOString();
            const ev: TimelineEvent = {
                id: nextTimelineId(),
                date: ts.slice(0, 10),
                timestamp: ts,
                title: '📌 تسجيل صدور أمر القبض — تكليف حضور',
                description: 'سُجّل صدور أمر القبض بعد موافقة مسار المفاتحة.',
                type: 'summons',
                source: 'التبليغ',
                metadata: timelineDebtorMetadata(targetKey),
            };
            const next = [ev, ...prev];
            persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, { ...a, arrestOrderRecorded: true }, pk),
                timelineEvents: next,
            });
            return next;
        });
        showToast('تم تسجيل صدور أمر القبض', 'success');
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        nextTimelineId,
        persistExecutionMerge,
        primaryDebtorKeyResolved,
        showToast,
    ]);

    const handleEmployeeWarrantOutcome = useCallback(
        (which: 'brought' | 'terminate') => {
            const d = executionData;
            if (!d) return;
            if (!(forcedBringDecisionState.approved && !forcedBringDecisionState.pending)) {
                showToast('لا يمكن تسجيل نتيجة أمر القبض قبل موافقة المنفذ على طلب الإحضار الجبري.', 'warning');
                return;
            }
            const targetKey = unifiedSummonsTargetDebtorKey;
            const pk = primaryDebtorKeyResolved;
            const a0 = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
            if (!a0) return;
            const ts = new Date().toISOString();
            setTimelineEvents((prev) => {
                const ev: TimelineEvent =
                    which === 'brought'
                        ? {
                              id: nextTimelineId(),
                              date: ts.slice(0, 10),
                              timestamp: ts,
                              title: '✓ تم إحضار المدين — بعد أمر القبض',
                              description: 'أُنهي تكليف الحضور بعد التنفيذ.',
                              type: 'summons',
                              source: 'التبليغ',
                              metadata: timelineDebtorMetadata(targetKey),
                          }
                        : {
                              id: nextTimelineId(),
                              date: ts.slice(0, 10),
                              timestamp: ts,
                              title: '⏹ إنهاء التكليف بالحضور',
                              description: 'أُنهي التكليف دون إحضار (تسجيل يدوي).',
                              type: 'summons',
                              source: 'التبليغ',
                              metadata: timelineDebtorMetadata(targetKey),
                          };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                    timelineEvents: next,
                });
                return next;
            });
            showToast(which === 'brought' ? 'تم التسجيل' : 'تم إنهاء التكليف', 'success');
        },
        [
            unifiedSummonsTargetDebtorKey,
            executionData,
            executionData?.employee_summons_assignments_by_debtor,
            executionData?.employee_summons_assignment,
            nextTimelineId,
            persistExecutionMerge,
            primaryDebtorKeyResolved,
            forcedBringDecisionState.approved,
            forcedBringDecisionState.pending,
            showToast,
        ]
    );

    /** بعد موافقة المنفذ على الإحضار الجبري: نفس دورة الحياة (حضور / تجاهل / متخفي) + إنهاء التكليف */
    const handleEmployeeAssignmentResolveForcedBringOutcome = useCallback(
        (which: 'brought' | 'absconded' | 'dismissed') => {
            const d = executionData;
            if (!d) return;
            if (!employeeForcedBringAwaitingPersonalOutcome) {
                showToast('لا يمكن تسجيل النتيجة الآن. الحالة ليست بانتظار نتيجة الإحضار الجبري.', 'warning');
                return;
            }
            const targetKey = unifiedSummonsTargetDebtorKey;
            const pk = primaryDebtorKeyResolved;
            const a0 = getEmployeeAssignmentForDebtorKey(d, targetKey, pk);
            if (!a0) return;
            const ts = new Date().toISOString();
            const label =
                which === 'brought'
                    ? '✅ تم إحضار المدين أمام المنفذ'
                    : which === 'dismissed'
                      ? '↩️ تم تجاهل متابعة الإحضار الجبري'
                      : '⚠️ المدين متخفي عن الأنظار';
            const lifecyclePatch = buildForcedBringPersonalOutcomePatch(which);
            setTimelineEvents((prev) => {
                const ev: TimelineEvent = {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: label,
                    description: 'تسجيل نتيجة مسار الإحضار الجبري الشخصي بشأن المدين — مع إنهاء تكليف الحضور.',
                    type: 'coercive',
                    source: 'محضر المتابعة',
                    metadata: timelineDebtorMetadata(targetKey),
                };
                const next = [ev, ...prev];
                persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                    ...lifecyclePatch,
                    timelineEvents: next,
                });
                return next;
            });
            const exId = String(d.id ?? '').trim();
            if (exId) {
                closePersonalCoerciveSubtypeDecisionCycle({
                    executionId: exId,
                    subtype: 'forced_bring_in',
                    debtorKey: targetKey,
                    primaryDebtorKey: pk,
                });
            }
            showToast(
                which === 'absconded'
                    ? 'تم التسجيل — راجع مسار المفاتحة عند الحاجة.'
                    : 'تم التسجيل وتصفير دورة الإحضار الجبري لإتاحة طلب جديد عند الحاجة.',
                which === 'dismissed' ? 'info' : 'success',
            );
        },
        [
            executionData,
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved,
            nextTimelineId,
            persistExecutionMerge,
            employeeForcedBringAwaitingPersonalOutcome,
            showToast,
        ]
    );

    return {
        handleEmployeeAssignmentConfirm,
        handleEmployeeAssignmentAttend,
        handleEmployeeAssignmentDeclareAbsent,
        handleEmployeeAssignmentTerminate,
        handleEmployeeAssignmentRequestInvestigation,
        handleEmployeeAssignmentRequestForcedBring,
        handleEmployeeRegisterArrestOrder,
        handleEmployeeWarrantOutcome,
        handleEmployeeAssignmentResolveForcedBringOutcome,
    };
}

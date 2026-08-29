/** Investigation / warrant / forced-bring branch of employee assignment handlers */
import { useCallback } from 'react';
import { addCalendarDaysYmd } from '@/app/utils/executionYmdCalendar';
import {
    appendPersonalCoerciveExecutorRequest,
    closePersonalCoerciveSubtypeDecisionCycle,
} from '@/app/utils/executorSeizureDecisionQueue';
import { buildForcedBringPersonalOutcomePatch } from '@/app/components/lawyer/execution/forcedBringInvestigationLifecycle';
import {
    buildEmployeeAssignmentPatchForDebtorKey,
    getEmployeeAssignmentForDebtorKey,
} from '@/app/utils/employeeSummonsAssignment';
import { timelineDebtorMetadata } from '@/app/utils/timelineDebtorScope';
import type { UseExecutionDashboardEmployeeAssignmentHandlersParams } from './useExecutionDashboardEmployeeAssignmentHandlers.types';
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';
import type { TimelineEvent } from '@/app/types/execution';

export function useEmployeeAssignmentInvestigationHandlers(
    p: UseExecutionDashboardEmployeeAssignmentHandlersParams,
) {
    const {
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
        forcedBringDecisionState,
        employeeForcedBringAwaitingPersonalOutcome,
    } = p;

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
            queueMicrotask(() => {
                toastAfterExecutionPersist(
                    persistExecutionMerge({
                        ...buildEmployeeAssignmentPatchForDebtorKey(
                            d,
                            targetKey,
                            { ...a, arrestOrderRecorded: true },
                            pk,
                        ),
                        timelineEvents: next,
                    }),
                    showToast,
                    'تم تسجيل صدور أمر القبض',
                );
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
                queueMicrotask(() => {
                    toastAfterExecutionPersist(
                        persistExecutionMerge({
                            ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                            timelineEvents: next,
                        }),
                        showToast,
                        which === 'brought' ? 'تم التسجيل' : 'تم إنهاء التكليف',
                    );
                });
                return next;
            });
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
        handleEmployeeAssignmentRequestInvestigation,
        handleEmployeeAssignmentRequestForcedBring,
        handleEmployeeRegisterArrestOrder,
        handleEmployeeWarrantOutcome,
        handleEmployeeAssignmentResolveForcedBringOutcome,
    };
}

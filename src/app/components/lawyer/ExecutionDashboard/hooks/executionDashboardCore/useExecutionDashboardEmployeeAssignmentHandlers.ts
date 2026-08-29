/** مسار تكليف حضور المدين الموظف — handlers محضر المتابعة والتبليغ */
import { useCallback } from 'react';
import type { TimelineEvent } from '@/app/types/execution';
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
import { toastAfterExecutionPersist } from '../../helpers/toastAfterExecutionPersist';
export type { UseExecutionDashboardEmployeeAssignmentHandlersParams } from './useExecutionDashboardEmployeeAssignmentHandlers.types';
import type { UseExecutionDashboardEmployeeAssignmentHandlersParams } from './useExecutionDashboardEmployeeAssignmentHandlers.types';
import { useEmployeeAssignmentInvestigationHandlers } from './useEmployeeAssignmentInvestigationHandlers';

export function useExecutionDashboardEmployeeAssignmentHandlers(
    params: UseExecutionDashboardEmployeeAssignmentHandlersParams,
) {
    const {
        executionData,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setTimelineEvents,
    } = params;

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
            let persisted: boolean | void = true;
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
                persisted = persistExecutionMerge({
                    ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, assignment, pk),
                    ...buildDebtorSummonsMarkerPatchForKey(d, targetKey, pk, null),
                    ...buildPublicationNoticePatchForDebtorKey(d, targetKey, null),
                    timelineEvents: next,
                });
                return next;
            });
            toastAfterExecutionPersist(persisted, showToast, 'تم تسجيل التكليف بالحضور');
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
        let persisted: boolean | void = true;
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
            persisted = persistExecutionMerge({
                ...buildEmployeeAssignmentPatchForDebtorKey(d, targetKey, null, pk),
                timelineEvents: next,
            });
            return next;
        });
        toastAfterExecutionPersist(persisted, showToast, 'تم تسجيل الحضور وإنهاء التكليف');
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


    const investigation = useEmployeeAssignmentInvestigationHandlers(params);

    return {
        handleEmployeeAssignmentConfirm,
        handleEmployeeAssignmentAttend,
        handleEmployeeAssignmentDeclareAbsent,
        handleEmployeeAssignmentTerminate,
        ...investigation,
    };
}

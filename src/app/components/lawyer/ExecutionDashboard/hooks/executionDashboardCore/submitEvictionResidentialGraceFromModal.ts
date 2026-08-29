import type { TimelineEvent } from '@/app/types/execution';
import { syncExecutionTimelineAppointment } from '@/app/services/calendarDossierSync';
import { patchExecutorDecisionRow } from '@/app/utils/executorSeizureDecisionQueue';
import { stripResidentialGraceTimelineEvents } from '@/app/utils/residentialGraceTimeline';
import { evictionInclusiveCalendarDays } from '@/app/components/lawyer/ExecutionDashboard/helpers';
import type { UseExecutionDashboardEvictionResidentialGraceHandlersParams } from './useExecutionDashboardEvictionResidentialGraceHandlers.types';

type SubmitParams = Pick<
    UseExecutionDashboardEvictionResidentialGraceHandlersParams,
    | 'graceModalAllowResave'
    | 'graceModalStartYmd'
    | 'graceModalEndYmd'
    | 'evictionResidentialGracePeriodStart'
    | 'evictionVacateDeadlineLocal'
    | 'isResidentialVacateGraceFinished'
    | 'residentialVacateDeadlineMaxIso'
    | 'showToast'
    | 'nextTimelineId'
    | 'timelineEvents'
    | 'persistExecutionMerge'
    | 'executionData'
    | 'file'
    | 'evictionGraceDecisionId'
    | 'executionId'
    | 'currentFileId'
    | 'setEvictionVacateDeadlineLocal'
    | 'setEvictionVacateDraft'
    | 'setEvictionResidentialGracePeriodStart'
    | 'setEvictionExecutorVacateGrantApproved'
    | 'setEvictionResidentialGraceManuallyEndedAt'
    | 'setTimelineEvents'
    | 'setEvictionGraceDecisionId'
    | 'setGraceModalAllowResave'
    | 'setShowEvictionResidentialGraceModal'
>;

export function submitEvictionResidentialGraceFromModal(p: SubmitParams): void {
    if (
        !p.graceModalAllowResave &&
        p.evictionResidentialGracePeriodStart &&
        /^\d{4}-\d{2}-\d{2}$/.test(p.evictionResidentialGracePeriodStart) &&
        p.evictionVacateDeadlineLocal &&
        /^\d{4}-\d{2}-\d{2}$/.test(p.evictionVacateDeadlineLocal) &&
        !p.isResidentialVacateGraceFinished
    ) {
        p.showToast(
            'المهلة مسجّلة. لإعادة ضبط المدة أو حفظ مهلة جديدة يُنفَّذ أولاً إنهاء دورة المهلة.',
            'warning',
        );
        return;
    }
    const start = p.graceModalStartYmd.trim();
    const end = p.graceModalEndYmd.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        p.showToast('اختر تاريخ بداية المهلة وتاريخ انتهائها بشكل صحيح.', 'warning');
        return;
    }
    if (start > end) {
        p.showToast('تاريخ البداية لا يجوز أن يتأخر عن تاريخ الانتهاء', 'warning');
        return;
    }
    if (p.residentialVacateDeadlineMaxIso && end > p.residentialVacateDeadlineMaxIso) {
        p.showToast(
            `لا يجوز تجاوز ${p.residentialVacateDeadlineMaxIso} (أقصى 90 يوماً تقويمياً بعد الإخبار)`,
            'warning',
        );
        return;
    }
    const days = evictionInclusiveCalendarDays(start, end);
    if (days <= 0) {
        p.showToast('تأكد من صحة المدة بين التاريخين', 'warning');
        return;
    }
    p.setEvictionVacateDeadlineLocal(end);
    p.setEvictionVacateDraft(end);
    p.setEvictionResidentialGracePeriodStart(start);
    p.setEvictionExecutorVacateGrantApproved(false);
    p.setEvictionResidentialGraceManuallyEndedAt(null);

    const now = new Date().toISOString();
    const day = now.slice(0, 10);
    const ev: TimelineEvent = {
        id: p.nextTimelineId(),
        type: 'eviction',
        title: '🏠 مهلة',
        description: `من ${start} إلى ${end} — ${days} يوماً تقويمياً`,
        date: day,
        timestamp: now,
        source: 'الإجراءات الجبرية — تخلية',
        metadata: {
            evictionResidentialGraceModal: true,
            graceStartYmd: start,
            graceEndYmd: end,
            graceDays: days,
        },
    };
    const appointmentEv: TimelineEvent = {
        id: p.nextTimelineId(),
        type: 'appointment',
        date: `${end}T12:00:00`,
        timestamp: now,
        title: '⏳ انتهاء المهلة',
        description: `المهلة ${days} يوماً (من ${start} إلى ${end})`,
        source: 'المهلة',
        metadata: {
            residentialGraceDeadlineAppointment: true,
            graceStartYmd: start,
            graceEndYmd: end,
            graceDays: days,
        },
    };
    const nextTimeline = [ev, appointmentEv, ...stripResidentialGraceTimelineEvents(p.timelineEvents)];
    p.setTimelineEvents(nextTimeline);
    syncExecutionTimelineAppointment({
        executionId: p.currentFileId,
        event: appointmentEv,
        caseNo:
            String(p.executionData?.fileNumber ?? p.executionData?.caseNo ?? p.file?.fileNumber ?? '').trim() ||
            undefined,
        clientName:
            String(
                p.executionData?.creditors?.[0]?.name ??
                    p.executionData?.clientName ??
                    p.file?.creditors?.[0]?.name ??
                    '',
            ).trim() || undefined,
    });

    p.persistExecutionMerge({
        eviction_vacate_deadline: end,
        eviction_residential_grace_period_start: start,
        eviction_executor_vacate_grant_approved: false,
        eviction_residential_grace_manually_ended_at: null,
        timelineEvents: nextTimeline,
    });

    if (p.evictionGraceDecisionId) {
        patchExecutorDecisionRow(p.executionData?.id ?? p.executionId, p.evictionGraceDecisionId, {
            evictionGraceSavedAt: now,
            evictionGraceStartYmd: start,
            evictionGraceEndYmd: end,
            evictionGraceDays: days,
        });
        p.setEvictionGraceDecisionId(null);
    }

    p.setGraceModalAllowResave(false);
    p.setShowEvictionResidentialGraceModal(false);
    p.showToast(
        p.graceModalAllowResave
            ? 'تم تحديث المهلة.'
            : 'تم تسجيل المهلة — يُحدَّث السجل والمواعيد تلقائياً.',
        'success',
    );
}

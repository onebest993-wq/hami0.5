import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { TimelineEvent } from '../../../../LawyerShared';
import { resolveNextPleadingAppointmentTitle } from '../../../smartFile/pleadingAppointmentTitle';
import { syncLawsuitTimelineAppointment } from '@/app/services/calendar/dossierSyncLazy';
import { buildLawsuitCalendarContext } from '../../procedural/lawsuitCalendarContext';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import type { JudgmentConfirmRuntime, JudgmentConfirmScope } from './judgmentConfirmTypes';

export function applyAdjournPleadingScenario(
    scope: JudgmentConfirmScope,
    rt: JudgmentConfirmRuntime,
): void {
    const { activeStageIndex, currentStage, parentData } = scope;
    const nextHearingDate = rt.judgmentDate.slice(0, 10);
    const stage = rt.updatedStages[activeStageIndex] ?? currentStage;
    const appointmentTitle = resolveNextPleadingAppointmentTitle(stage);

    const appointment: TimelineEvent = {
        id: `appt_adjourn_${Date.now()}`,
        type: 'appointment',
        date: nextHearingDate,
        title: appointmentTitle,
        details:
            appointmentTitle === 'أول مرافعة بعد النقض'
                ? 'موعد أول مرافعة بعد نقض التمييز واستئناف السير.'
                : 'موعد المرافعة القادم بعد تأجيل الجلسة.',
        subType: 'pleading',
        isNew: true,
    };

    const milestone: TimelineEvent = {
        id: `adjourn_${Date.now()}`,
        type: 'decision',
        date: getLocalTodayYmd(),
        title: 'تأجيل المرافعة',
        details: `تم تأجيل المرافعة — الموعد القادم: ${nextHearingDate}`,
        isNew: true,
    };

    rt.updatedStages[activeStageIndex] = {
        ...stage,
        isPleadingsClosed: false,
        awaitingOpponentAppeal: false,
        pleadingDoorReopened: true,
        timeline: [milestone, appointment, ...(stage.timeline ?? [])],
    };

    const calCtx = buildLawsuitCalendarContext(parentData, resolveCalendarUserId());
    if (calCtx.fileId) {
        syncLawsuitTimelineAppointment({
            userId: calCtx.userId,
            fileId: calCtx.fileId,
            event: {
                id: appointment.id,
                date: nextHearingDate,
                title: appointmentTitle,
                details: appointment.details,
            },
        });
    }

    rt.handled = true;
    rt.successToast = 'تم تأجيل المرافعة وتسجيل الموعد القادم';
}

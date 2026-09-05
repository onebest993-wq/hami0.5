import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { isPleadingHearingAppointment } from './timelineLegalDeadline';

function isRemandReopenMilestone(event: TimelineEvent): boolean {
    const title = String(event.title ?? '');
    return title.includes('نقض التمييز') || title.includes('استئناف السير');
}

export function resolveNextPleadingAppointmentTitle(stage: CaseStage | undefined | null): string {
    const timeline = stage?.timeline ?? [];
    const remandIdx = timeline.findIndex(isRemandReopenMilestone);

    if (remandIdx >= 0) {
        const newerEvents = timeline.slice(0, remandIdx);
        const hasPleadingAfterRemand = newerEvents.some((event) => isPleadingHearingAppointment(event));
        if (!hasPleadingAfterRemand) {
            return 'أول مرافعة بعد النقض';
        }
    }

    const hasPleadingAppointment = timeline.some((event) => isPleadingHearingAppointment(event));
    if (!hasPleadingAppointment) {
        return 'أول مرافعة';
    }

    return 'موعد المرافعة';
}

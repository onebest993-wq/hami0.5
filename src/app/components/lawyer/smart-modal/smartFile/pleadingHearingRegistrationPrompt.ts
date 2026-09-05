import type { CaseStage } from '../../LawyerShared';
import { isAppealStageName, isCassationStageName } from './judgmentTypes';
import { isPleadingHearingAppointment } from './timelineLegalDeadline';
import { resolveNextPleadingAppointmentTitle } from './pleadingAppointmentTitle';

function isReopenOrNewStageMilestone(title: string): boolean {
    const t = String(title ?? '');
    return (
        t.includes('نقض التمييز')
        || t.includes('استئناف السير')
        || t.includes('فتح إضبارة')
        || t.includes('فتح باب المرافعة')
        || t.includes('إعادة فتح باب المرافعة')
        || t.includes('تسجيل طعن')
        || t.includes('قام الخصم')
    );
}

function stageNeedsFirstPleading(stage: CaseStage): boolean {
    const timeline = stage.timeline ?? [];
    if (timeline.some((event) => isPleadingHearingAppointment(event))) return false;

    const reopenIdx = timeline.findIndex((event) =>
        isReopenOrNewStageMilestone(String(event.title ?? '')),
    );
    if (reopenIdx >= 0) {
        const newerEvents = timeline.slice(0, reopenIdx);
        return !newerEvents.some((event) => isPleadingHearingAppointment(event));
    }

    if (stage.pleadingDoorReopened) return true;

    const name = String(stage.stageName ?? stage.name ?? '');
    const isAppealLike =
        Boolean(stage.appealMetadata)
        || isAppealStageName(name)
        || (isCassationStageName(name) && stage.wasReopened);

    return Boolean(isAppealLike && timeline.length > 0);
}

/** بعد نقض / طعن خصم / فتح باب المرافعة: اطلب تسجيل أول جلسة إن لم تُسجَّل */
export function shouldPromptPleadingHearingRegistration(stage: CaseStage | null | undefined): boolean {
    if (!stage || stage.isPleadingsClosed) return false;
    const name = String(stage.stageName ?? stage.name ?? '');
    /* التمييز بلا ترافع — لا تطلب جلسة عند فتح المرحلة */
    if (isCassationStageName(name) && !stage.wasReopened) return false;
    return stageNeedsFirstPleading(stage);
}

export function resolvePleadingHearingRegistrationLabel(stage: CaseStage | null | undefined): string {
    return resolveNextPleadingAppointmentTitle(stage ?? undefined);
}

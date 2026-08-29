import type { CaseStage, NotificationStatus } from '../../LawyerShared';

function cloneStages(stages: CaseStage[]): CaseStage[] {
    return [...stages];
}

export function patchActiveStage(
    stages: CaseStage[],
    activeStageIndex: number,
    patch: Record<string, unknown> | ((stage: CaseStage) => CaseStage),
): CaseStage[] {
    const updated = cloneStages(stages);
    const current = stages[activeStageIndex];
    if (!current) return updated;

    updated[activeStageIndex] =
        typeof patch === 'function'
            ? patch(current)
            : ({ ...current, ...patch } as CaseStage);

    return updated;
}

export function parseStepperStageIndex(stageId: string, stagesLength: number): number | null {
    if (!stageId || typeof stageId !== 'string') return null;
    const stageIndex = parseInt(stageId.replace('stg_', ''), 10) - 1;
    if (isNaN(stageIndex) || stageIndex < 0 || stageIndex >= stagesLength) return null;
    return stageIndex;
}

const NOTIFICATION_STATUSES: NotificationStatus[] = [
    'pending',
    'in_person',
    'via_media',
    'publication',
];

export function cycleDefendantNotificationStatus(
    currentStatus: string,
): NotificationStatus {
    const normalized =
        currentStatus === 'waiting' ? 'pending' : (currentStatus as NotificationStatus);
    const currentIndex = NOTIFICATION_STATUSES.indexOf(normalized);
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % NOTIFICATION_STATUSES.length : 0;
    return NOTIFICATION_STATUSES[nextIndex]!;
}

export function buildNotificationTogglePatch(
    stage: CaseStage,
    nextStatus: NotificationStatus,
): Record<string, unknown> {
    const stageExt = stage as CaseStage & { parties?: Record<string, unknown>[] };
    const updatedParties = [...(stageExt.parties || [])];
    if (updatedParties[1]) {
        updatedParties[1] = { ...updatedParties[1], notificationStatus: nextStatus };
    }

    return {
        defendantNotificationStatus: nextStatus,
        parties: updatedParties,
    };
}

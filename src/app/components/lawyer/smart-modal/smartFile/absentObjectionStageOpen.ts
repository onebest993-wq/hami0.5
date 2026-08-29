import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { applyAppealStageTransition } from './appealStageTransition';
import { resolveAppealStageCaseNumber } from './absentObjectionCaseNumber';

const ABSENT_OBJECTION_APPEAL_TYPE = 'اعتراض على الحكم الغيابي';

export type OpenAbsentObjectionStageInput = {
    stages: CaseStage[];
    activeStageIndex: number;
    currentStage: CaseStage;
    filingDate: string;
    sourceCaseNo?: string;
    newCaseNumber?: string;
    archiveTimelineEvent: TimelineEvent;
    archiveFinalDecision?: string | null;
    archiveDecisionDate?: string | null;
    /** جلسة المرافعة الأولى — تُضاف على مرحلة الاعتراض الجديدة. */
    sessionDate?: string;
};

export type OpenAbsentObjectionStageResult = {
    updatedStages: CaseStage[];
    newActiveIndex: number;
    resolvedCaseNumber: string;
    sessionEventId?: string;
};

/**
 * فتح إضبارة الاعتراض على الحكم الغيابي — مرحلة جديدة + انقلاب المراكز.
 * لا يُعاد تسمية مرحلة البداءة في مكانها.
 */
export function openAbsentObjectionStage(
    input: OpenAbsentObjectionStageInput,
): OpenAbsentObjectionStageResult {
    const resolvedCaseNumber = resolveAppealStageCaseNumber(
        ABSENT_OBJECTION_APPEAL_TYPE,
        input.newCaseNumber ?? '',
        input.currentStage.caseNo ?? input.sourceCaseNo,
    );

    const { updatedStages, newActiveIndex } = applyAppealStageTransition(
        input.stages,
        input.activeStageIndex,
        input.currentStage,
        {
            appealType: ABSENT_OBJECTION_APPEAL_TYPE,
            appellant: 'المدعى عليه',
            filingDate: input.filingDate,
            newCaseNumber: resolvedCaseNumber,
            archiveTimelineEvent: input.archiveTimelineEvent,
            archiveFinalDecision: input.archiveFinalDecision,
            archiveDecisionDate: input.archiveDecisionDate,
        },
    );

    const sessionDate = String(input.sessionDate ?? '').trim();
    let sessionEventId: string | undefined;
    if (sessionDate) {
        const newStage = updatedStages[newActiveIndex];
        sessionEventId = `appt_obj_${Date.now()}`;
        const sessionEvent: TimelineEvent = {
            id: sessionEventId,
            type: 'appointment',
            date: sessionDate,
            title: 'جلسة مرافعة (اعتراض غيابي)',
            details: 'نظر الاعتراض الغيابي',
            isNew: true,
        };
        updatedStages[newActiveIndex] = {
            ...newStage,
            timeline: [sessionEvent, ...(newStage.timeline ?? [])],
        };
    }

    return { updatedStages, newActiveIndex, resolvedCaseNumber, sessionEventId };
}

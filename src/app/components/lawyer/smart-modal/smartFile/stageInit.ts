import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import type { CaseStage } from '../../LawyerShared';

/** بناء المراحل الأولية من ملف الدعوى عند فتح Smart File Modal. */
export function buildInitialStagesFromFile(file: Record<string, unknown> | null | undefined): CaseStage[] {
    const stagesRaw = file?.stages;
    if (Array.isArray(stagesRaw) && stagesRaw.length > 0) {
        return stagesRaw as CaseStage[];
    }

    const parties = Array.isArray(file?.parties) ? file.parties : [];
    const history = Array.isArray(file?.history) ? file.history : [];
    const tasks = Array.isArray(file?.tasks) ? file.tasks : [];
    const incidentalCases = Array.isArray(file?.incidentalCases) ? file.incidentalCases : [];

    const stageName = typeof file?.currentStage === 'string' ? file.currentStage : 'البداءة';

    return [
        {
            id: `stage_${Date.now()}`,
            name: stageName,
            stageName,
            caseNo: typeof file?.caseNo === 'string' ? file.caseNo : '',
            court: typeof file?.court === 'string' ? file.court : '',
            judge: typeof file?.judge === 'string' ? file.judge : '',
            parties,
            timeline: history,
            tasks,
            incidentalCases,
            createdDate: typeof file?.date === 'string' ? file.date : getLocalTodayYmd(),
            finalDecision: null,
            decisionDate: null,
            status: 'active',
        } as unknown as CaseStage,
    ];
}

export function resolveInitialStageIndex(
    file: Record<string, unknown> | null | undefined,
    stagesLength: number,
): number {
    if (stagesLength <= 0) return 0;
    const idx = file?.activeStageIndex;
    if (typeof idx === 'number' && idx >= 0 && idx < stagesLength) {
        return idx;
    }
    return stagesLength - 1;
}

export function isViewingArchivedStage(stage: CaseStage | undefined): boolean {
    if (!stage) return false;
    return stage.status === 'completed' || stage.status === 'locked' || !!stage.isVoided;
}

export function getDisplayTimelineFromStage(stage: CaseStage | undefined) {
    const timeline = stage?.timeline ?? [];
    const active = timeline.filter((e) => !(e as { isDeleted?: boolean }).isDeleted);
    const deleted = timeline.filter((e) => (e as { isDeleted?: boolean }).isDeleted);
    return { displayTimeline: active, deletedEvents: deleted };
}

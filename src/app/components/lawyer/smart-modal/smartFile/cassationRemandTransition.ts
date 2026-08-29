import { getLocalTodayYmd } from '@/app/utils/localYmd';
import {
    isPersonalStatusAppealContext,
    isPersonalStatusCoreStage,
} from '@/app/components/lawyer/personal-status/personalStatusStageDisplay';
import {
    resolveLastPleadingStageIndex,
    resolvePleadingLayer,
} from './pleadingStageClassification';
import type { CaseStage, TimelineEvent } from '../../LawyerShared';
import { isAppealStageName, isFirstInstanceStageName } from './judgmentTypes';
import { stageLabel } from './appealStageTransitionShared';

type CassationRemandTarget = {
    stageName: string;
    sourceStageIndex: number;
    remandLayer: 'appeal' | 'first_instance';
};

/** بعد نقض التمييز: العودة لآخر مرحلة مرافعة (استئناف · بداءة · اعتراض · إعادة محاكمة). */
export function resolveCassationRemandTarget(
    stages: CaseStage[],
    cassationStageIndex: number,
): CassationRemandTarget {
    const pleadingIdx = resolveLastPleadingStageIndex(stages, cassationStageIndex);
    if (pleadingIdx >= 0) {
        const name = stageLabel(stages[pleadingIdx]);
        return {
            stageName: name || 'البداءة',
            sourceStageIndex: pleadingIdx,
            remandLayer: resolvePleadingLayer(name),
        };
    }

    const prior = stages.slice(0, Math.max(0, cassationStageIndex));
    for (let i = prior.length - 1; i >= 0; i--) {
        const name = stageLabel(prior[i]);
        if (isPersonalStatusAppealContext(name, prior) && isPersonalStatusCoreStage(name)) {
            return {
                stageName: name || 'أحوال شخصية',
                sourceStageIndex: i,
                remandLayer: 'first_instance',
            };
        }
    }

    const fallbackIdx = prior.length > 0 ? 0 : 0;
    const source = prior[fallbackIdx];
    return {
        stageName: stageLabel(source) || 'البداءة',
        sourceStageIndex: fallbackIdx,
        remandLayer: 'first_instance',
    };
}

type CassationRemandParams = {
    remandDate?: string;
    notes?: string;
    cassationTimelineEvent?: TimelineEvent;
    cassationFinalDecision?: string;
};

export function applyCassationRemand(
    stages: CaseStage[],
    cassationStageIndex: number,
    params?: CassationRemandParams,
): { updatedStages: CaseStage[]; newActiveIndex: number; target: CassationRemandTarget } {
    const updatedStages = [...stages];
    const currentStage = updatedStages[cassationStageIndex];
    if (!currentStage) {
        throw new Error('applyCassationRemand: cassation stage not found');
    }

    const now = params?.remandDate ?? getLocalTodayYmd();
    const target = resolveCassationRemandTarget(stages, cassationStageIndex);
    if (target.sourceStageIndex === cassationStageIndex) {
        throw new Error('applyCassationRemand: no distinct prior stage to remand to');
    }
    const sourceStage = stages[target.sourceStageIndex];
    if (!sourceStage) {
        throw new Error('applyCassationRemand: remand source stage missing');
    }

    const cassationTimeline = params?.cassationTimelineEvent
        ? [params.cassationTimelineEvent, ...(currentStage.timeline ?? [])]
        : currentStage.timeline;

    updatedStages[cassationStageIndex] = {
        ...currentStage,
        status: 'completed',
        finalDecision: params?.cassationFinalDecision ?? 'منقوض (إعادة للمحاكمة)',
        decisionDate: currentStage.decisionDate ?? now,
        isPleadingsClosed: true,
        timeline: cassationTimeline,
    };

    const remandNotes = String(params?.notes ?? '').trim();
    const remandTimelineEvent: TimelineEvent = {
        id: `cass_remand_open_${Date.now()}`,
        type: 'milestone',
        date: now,
        title: `↩️ نقض التمييز — استئناف السير في ${target.stageName}`,
        details: remandNotes
            ? `${remandNotes}\n\nبعد نقض محكمة التمييز للحكم، تُستأنف الإضبارة نفسها في مرحلة ${target.stageName} دون فتح سجل منفصل.`
            : `بعد نقض محكمة التمييز للحكم، تُستأنف الإضبارة نفسها في مرحلة ${target.stageName} دون فتح سجل منفصل.`,
        isNew: true,
        color: 'red',
    };

    const priorTimeline = sourceStage.timeline ?? [];
    updatedStages[target.sourceStageIndex] = {
        ...sourceStage,
        status: 'active',
        isPleadingsClosed: false,
        awaitingOpponentAppeal: false,
        awaitingAbsentJudgmentNotification: false,
        isUnderObjection: false,
        finalDecision: null,
        decisionDate: null,
        wasReopened: true,
        timeline: [remandTimelineEvent, ...priorTimeline],
        firstInstanceCaseNumber:
            sourceStage.firstInstanceCaseNumber
            ?? currentStage.firstInstanceCaseNumber
            ?? (target.remandLayer === 'first_instance' ? sourceStage.caseNo : undefined),
        firstInstanceCourt:
            sourceStage.firstInstanceCourt
            ?? currentStage.firstInstanceCourt
            ?? (target.remandLayer === 'first_instance' ? sourceStage.court : undefined),
    };

    return {
        updatedStages,
        newActiveIndex: target.sourceStageIndex,
        target,
    };
}

export function cassationRemandSuccessMessage(target: CassationRemandTarget): string {
    if (target.remandLayer === 'appeal') {
        return 'تم نقض الحكم وإعادة الإضبارة لمرحلة الاستئناف';
    }
    if (isPersonalStatusAppealContext(target.stageName)) {
        return `تم نقض الحكم وإعادة الإضبارة لمرحلة ${target.stageName}`;
    }
    return `تم نقض الحكم وإعادة الإضبارة لمرحلة ${target.stageName}`;
}

function isQuashedCassationStage(stage: CaseStage | undefined): boolean {
    if (!stage) return false;
    const name = stageLabel(stage);
    if (name !== 'التمييز' && !name.includes('تمييز')) return false;
    const fd = String(stage.finalDecision ?? '');
    return fd.includes('منقوض') || fd.includes('إعادة');
}

/** دمج إضبارات النقض القديمة التي فُتحت كمرحلة مستقلة */
export function normalizeLegacyCassationRemandStages(stages: CaseStage[]): CaseStage[] {
    if (stages.length < 3) return stages;

    const result = [...stages];
    for (let i = result.length - 1; i >= 0; i--) {
        const dup = result[i];
        if (!dup?.wasReopened || dup.status !== 'active') continue;

        const name = stageLabel(dup);
        const isRemandTarget = isAppealStageName(name) || isFirstInstanceStageName(name);
        if (!isRemandTarget) continue;

        let priorIdx = -1;
        for (let j = i - 1; j >= 0; j--) {
            if (stageLabel(result[j]) !== name) continue;
            const st = result[j]?.status;
            if (st === 'locked' || st === 'completed') {
                priorIdx = j;
                break;
            }
        }
        if (priorIdx < 0) continue;

        const between = result.slice(priorIdx + 1, i);
        if (!between.some((s) => isQuashedCassationStage(s))) continue;

        const prior = result[priorIdx]!;
        const seenIds = new Set<string>();
        const mergedTimeline = [...(dup.timeline ?? []), ...(prior.timeline ?? [])].filter((ev) => {
            const id = String(ev.id ?? '');
            if (!id || seenIds.has(id)) return false;
            seenIds.add(id);
            return true;
        });

        result[priorIdx] = {
            ...prior,
            ...dup,
            id: prior.id,
            status: 'active',
            wasReopened: true,
            isPleadingsClosed: dup.isPleadingsClosed ?? false,
            finalDecision: dup.finalDecision ?? null,
            decisionDate: dup.decisionDate ?? null,
            timeline: mergedTimeline,
            parties: dup.parties ?? prior.parties,
            attachments: dup.attachments ?? prior.attachments,
            incidentalCases: dup.incidentalCases ?? prior.incidentalCases,
            tasks: dup.tasks ?? prior.tasks,
        };
        result.splice(i, 1);
    }

    return result;
}
